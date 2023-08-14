/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { classes } from "@utils/misc";
import { LazyComponent, useForceUpdater } from "@utils/react";
import { findByCode } from "@webpack";
import { Button, ContextMenu, Flex, FluxDispatcher, Forms, useCallback, useEffect, useRef, UserStore, useState } from "@webpack/common";

import { BasicChannelTabsProps, ChannelTabsProps, channelTabsSettings as settings, ChannelTabsUtils } from "../util";
import BookmarkContainer from "./BookmarkContainer";
import ChannelTab, { PreviewTab } from "./ChannelTab";
import { BasicContextMenu, TabContextMenu } from "./ContextMenus";

const {
    closeTab, createTab, handleChannelSwitch, handleKeybinds, isTabSelected,
    moveToTab, saveTabs, openStartupTabs, setUpdaterFunction, useBookmarks
} = ChannelTabsUtils;

const PlusIcon = LazyComponent(() => findByCode("15 10 10 10"));
const XIcon = LazyComponent(() => findByCode("M18.4 4L12 10.4L5.6 4L4"));

const cl = (name: string) => `vc-channeltabs-${name}`;

export default function ChannelsTabsContainer(props: BasicChannelTabsProps & { userId: string; }) {
    const { openTabs } = ChannelTabsUtils;
    const [userId, setUserId] = useState(props.userId);
    const [ready, setReady] = useState(false);
    const { showBookmarkBar } = settings.use(["showBookmarkBar"]);

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
            if (id === userId && openTabs.length) return;
            setUserId(id);

            openStartupTabs({ ...props, userId: id }, setReady);
        };

        FluxDispatcher.subscribe("CONNECTION_OPEN_SUPPLEMENTAL", onLogin);
        // TODO: fix conflicts with discord's keybinds
        // document.addEventListener("keydown", handleKeybinds);
        return () => {
            FluxDispatcher.unsubscribe("CONNECTION_OPEN_SUPPLEMENTAL", onLogin);
            // document.removeEventListener("keydown", handleKeybinds);
        };
    }, []);

    useEffect(() => {
        (Vencord.Plugins.plugins.ChannelTabs as any).containerHeight = ref.current?.clientHeight;
    }, [ready, showBookmarkBar]);

    if (!ready) return null;
    handleChannelSwitch(props);
    saveTabs(userId);

    return <div
        className={cl("container")}
        ref={ref}
        onContextMenu={e => ContextMenu.open(e, () => <BasicContextMenu />)}
    >
        <div className={cl("inner-container")}>
            {openTabs.map((tab, i) => <div
                className={classes(cl("tab"), tab.compact ? cl("tab-compact") : null, isTabSelected(tab.id) ? cl("tab-selected") : null)}
                key={i}
                onAuxClick={e => {
                    if (e.button === 1 /* middle click */) {
                        closeTab(tab.id);
                    }
                }}
                onContextMenu={e => ContextMenu.open(e, () => <TabContextMenu tab={tab} />)}
            >
                <button
                    className={classes(cl("button"), cl("channel-info"))}
                    onClick={() => moveToTab(tab.id)}
                >
                    <ChannelTab {...tab} index={i} />
                </button>
                {openTabs.length > 1 && (tab.compact ? isTabSelected(tab.id) : true) && <button
                    className={classes(cl("button"), cl("close-button"), tab.compact ? cl("close-button-compact") : null)}
                    onClick={() => closeTab(tab.id)}
                >
                    <XIcon width={16} height={16} />
                </button>}
            </div>)
            }

            <button
                onClick={() => createTab(props, true)}
                className={classes(cl("button"), cl("new-button"))}
            >
                <PlusIcon />
            </button>
        </div >
        {showBookmarkBar && <>
            <div className={cl("separator")} />
            <BookmarkContainer {...props} />
        </>}
    </div>;
}

export function ChannelTabsPreview(p) {
    const id = UserStore.getCurrentUser()?.id;
    if (!id) return <Forms.FormText>there's no logged in account?????</Forms.FormText>;

    const { setValue }: { setValue: (v: { [userId: string]: ChannelTabsProps[]; }) => void; } = p;
    const { tabSet }: { tabSet: { [userId: string]: ChannelTabsProps[]; }; } = settings.use(["tabSet"]);
    const placeholder = [{ guildId: "@me", channelId: undefined as any }];
    const [currentTabs, setCurrentTabs] = useState(tabSet?.[id] ?? placeholder);

    return <>
        <Forms.FormTitle>Startup tabs</Forms.FormTitle>
        <Flex flexDirection="row" style={{ gap: "2px" }}>
            {currentTabs.map(t => <>
                <PreviewTab {...t} />
            </>)}
        </Flex>
        <Flex flexDirection="row-reverse">
            <Button
                onClick={() => {
                    setCurrentTabs([...ChannelTabsUtils.openTabs]);
                    setValue({ ...tabSet, [id]: [...ChannelTabsUtils.openTabs] });
                }}
            >Set to currently open tabs</Button>
        </Flex>
    </>;
}
