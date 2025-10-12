/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { IS_MAC } from "@utils/constants";
import { classes } from "@utils/misc";
import { useForceUpdater } from "@utils/react";
import { findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { Button, ContextMenuApi, Flex, FluxDispatcher, useCallback, useEffect, useRef, UserStore, useState, useStateFromStores } from "@webpack/common";

import { BasicChannelTabsProps, ChannelTabsProps, clearStaleNavigationContext, createTab, handleChannelSwitch, isNavigationFromSource, moveToTab, openedTabs, openStartupTabs, saveTabs, settings, setUpdaterFunction, useGhostTabs } from "../util";
import BookmarkContainer from "./BookmarkContainer";
import ChannelTab, { PreviewTab } from "./ChannelTab";
import { BasicContextMenu } from "./ContextMenus";

type TabSet = Record<string, ChannelTabsProps[]>;

const PlusSmallIcon = findComponentByCodeLazy("0v-5h5a1");
const ChannelRTCStore = findStoreLazy("ChannelRTCStore");

const cl = classNameFactory("vc-channeltabs-");

export default function ChannelsTabsContainer(props: BasicChannelTabsProps) {
    const [userId, setUserId] = useState("");
    const {
        showBookmarkBar,
        widerTabsAndBookmarks,
        tabWidthScale,
        enableHotkeys,
        hotkeyCount,
        tabBarPosition,
        animationHover,
        animationSelection,
        animationDragDrop,
        animationEnterExit,
        animationIconPop,
        animationCloseRotation,
        animationPlusPulse,
        animationMentionGlow,
        animationCompactExpand,
        animationSelectedBorder,
        animationSelectedBackground,
        animationTabShadows,
        animationTabPositioning,
        animationResizeHandle,
        animationQuestsActive,
        compactAutoExpandSelected,
        compactAutoExpandOnHover
    } = settings.use([
        "showBookmarkBar",
        "widerTabsAndBookmarks",
        "tabWidthScale",
        "enableHotkeys",
        "hotkeyCount",
        "tabBarPosition",
        "animationHover",
        "animationSelection",
        "animationDragDrop",
        "animationEnterExit",
        "animationIconPop",
        "animationCloseRotation",
        "animationPlusPulse",
        "animationMentionGlow",
        "animationCompactExpand",
        "animationSelectedBorder",
        "animationSelectedBackground",
        "animationTabShadows",
        "animationTabPositioning",
        "animationResizeHandle",
        "animationQuestsActive",
        "compactAutoExpandSelected",
        "compactAutoExpandOnHover"
    ]);
    const GhostTabs = useGhostTabs();
    const isFullscreen = useStateFromStores([ChannelRTCStore], () => ChannelRTCStore.isFullscreenInContext() ?? false);

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
            // Normalize guildId for comparison
            const normalizedGuildId = props.guildId || "@me";

            // Skip if this navigation came from a bookmark
            if (!isNavigationFromSource(normalizedGuildId, props.channelId, "bookmark")) {
                handleChannelSwitch(props);
            }

            saveTabs(userId);

            // Clean up any stale navigation contexts
            clearStaleNavigationContext();
        }
    }, [userId, props.channelId, props.guildId]);

    if (!userId) return null;

    if (isFullscreen) return null;

    return (
        <div
            className={classes(
                cl("container"),
                tabBarPosition === "top" && cl("container-top"),
                IS_MAC && tabBarPosition === "top" && cl("container-top-macos"),
                !animationHover && cl("no-hover-animation"),
                !animationSelection && cl("no-selection-animation"),
                !animationDragDrop && cl("no-drag-animation"),
                !animationEnterExit && cl("no-enter-exit-animation"),
                !animationIconPop && cl("no-icon-pop-animation"),
                !animationCloseRotation && cl("no-close-rotation"),
                !animationPlusPulse && cl("no-plus-animation"),
                !animationMentionGlow && cl("no-mention-glow"),
                !animationCompactExpand && cl("no-compact-animation"),
                !animationSelectedBorder && cl("no-selected-border"),
                !animationSelectedBackground && cl("no-selected-background"),
                !animationTabShadows && cl("no-tab-shadows"),
                !animationTabPositioning && cl("no-tab-positioning"),
                !animationResizeHandle && cl("no-resize-handle-animation"),
                !animationQuestsActive && cl("no-quests-active-animation"),
                !compactAutoExpandSelected && cl("no-compact-auto-expand"),
                !compactAutoExpandOnHover && cl("no-compact-hover-expand")
            )}
            ref={ref}
            style={{ "--tab-width-scale": tabWidthScale / 100 } as React.CSSProperties}
            onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <BasicContextMenu />)}
        >
            {showBookmarkBar && <>
                <BookmarkContainer {...props} userId={userId} />
                <div className={cl("separator")} />
            </>}
            <div className={cl("tab-container")}>
                {openedTabs.filter(tab => tab != null).map((tab, i) =>
                    <ChannelTab {...tab} index={i} key={tab.id} />
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
    if (!id) return <Paragraph>there's no logged in account?????</Paragraph>;

    const { setValue }: { setValue: (v: TabSet) => void; } = p;
    const { tabSet }: { tabSet: TabSet; } = settings.use(["tabSet"]);

    const placeholder = [{ guildId: "@me", channelId: undefined as any }];
    const [currentTabs, setCurrentTabs] = useState(tabSet?.[id] ?? placeholder);

    return (
        <>
            <Heading>Startup tabs</Heading>
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
