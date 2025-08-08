/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { classes } from "@utils/misc";
import { useForceUpdater } from "@utils/react";
import { findComponentByCodeLazy } from "@webpack";
import { Button, ContextMenuApi, Flex, FluxDispatcher, Forms, useCallback, useEffect, useRef, UserStore, useState } from "@webpack/common";

import { BasicChannelTabsProps, ChannelTabsProps, createTab, handleChannelSwitch, moveToTab, openedTabs, openStartupTabs, saveTabs, settings, setUpdaterFunction, useGhostTabs } from "../util";
import BookmarkContainer from "./BookmarkContainer";
import ChannelTab, { PreviewTab } from "./ChannelTab";
import { BasicContextMenu } from "./ContextMenus";

type TabSet = Record<string, ChannelTabsProps[]>;

const PlusSmallIcon = findComponentByCodeLazy("0v-5h5a1");

const cl = classNameFactory("vc-channeltabs-");

export default function ChannelsTabsContainer(props: BasicChannelTabsProps) {
    const [userId, setUserId] = useState("");
    const { showBookmarkBar, widerTabsAndBookmarks, enableHotkeys, hotkeyCount, tabBarPosition } = settings.use(["showBookmarkBar", "widerTabsAndBookmarks", "enableHotkeys", "hotkeyCount", "tabBarPosition"]);
    const GhostTabs = useGhostTabs();

    const _update = useForceUpdater();
    const update = useCallback((save = true) => {
        _update();
        if (save) saveTabs(userId);
    }, [userId]);

    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setUpdaterFunction(update);
        const onLogin = () => {
            const { id } = UserStore.getCurrentUser();
            if (id === userId && openedTabs.length) return;
            setUserId(id);

            openStartupTabs({ ...props, userId: id }, setUserId);
        };

        FluxDispatcher.subscribe("CONNECTION_OPEN_SUPPLEMENTAL", onLogin);
        return () => {
            FluxDispatcher.unsubscribe("CONNECTION_OPEN_SUPPLEMENTAL", onLogin);
        };
    }, []);

    useEffect(() => {
        if (ref.current) {
            try {
                (Vencord.Plugins.plugins.ChannelTabs as any).containerHeight = ref.current.clientHeight;
            } catch { }
        }
    }, [userId, showBookmarkBar, tabBarPosition]);

    useEffect(() => {
        _update();
    }, [widerTabsAndBookmarks]);
    useEffect(() => {
        if (!enableHotkeys) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;

            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }

            const keyNumber = parseInt(event.key, 10);

            if (!isNaN(keyNumber) && keyNumber >= 1 && keyNumber <= hotkeyCount) {
                const tabIndex = keyNumber - 1;
                if (openedTabs[tabIndex]) {
                    event.preventDefault();
                    moveToTab(openedTabs[tabIndex].id);
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [enableHotkeys, hotkeyCount]);

    useEffect(() => {
        if (userId) {
            handleChannelSwitch(props);
            saveTabs(userId);
        }
    }, [userId, props.channelId, props.guildId]);

    if (!userId) return null;

    return (
        <div
            className={classes(cl("container"), tabBarPosition === "top" && cl("container-top"))}
            ref={ref}
            onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <BasicContextMenu />)}
        >
            {showBookmarkBar && <>
                <BookmarkContainer {...props} userId={userId} />
                <div className={cl("separator")} />
            </>}
            <div className={cl("tab-container")}>
                {openedTabs.map((tab, i) =>
                    <ChannelTab {...tab} index={i} key={i} />
                )}

                <button
                    onClick={() => createTab(props, true)}
                    className={cl("button", "new-button", "hoverable")}
                >
                    <PlusSmallIcon />
                </button>

                {GhostTabs}
            </div >

        </div>
    );
}

export function ChannelTabsPreview(p) {
    const id = UserStore.getCurrentUser()?.id;
    if (!id) return <Forms.FormText>there's no logged in account?????</Forms.FormText>;

    const { setValue }: { setValue: (v: TabSet) => void; } = p;
    const { tabSet }: { tabSet: TabSet; } = settings.use(["tabSet"]);

    const placeholder = [{ guildId: "@me", channelId: undefined as any }];
    const [currentTabs, setCurrentTabs] = useState(tabSet?.[id] ?? placeholder);

    return (
        <>
            <Forms.FormTitle>Startup tabs</Forms.FormTitle>
            <Flex flexDirection="row" style={{ gap: "2px" }}>
                {currentTabs.map(t => <>
                    <PreviewTab {...t} />
                </>)}
            </Flex>
            <Flex flexDirection="row-reverse">
                <Button
                    onClick={() => {
                        setCurrentTabs([...openedTabs]);
                        setValue({ ...tabSet, [id]: [...openedTabs] });
                    }}
                >Set to currently open tabs</Button>
            </Flex>
        </>
    );
}
