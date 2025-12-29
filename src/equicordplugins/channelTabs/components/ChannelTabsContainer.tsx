/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { BasicChannelTabsProps, ChannelTabsProps, clearStaleNavigationContext, closeTab, createTab, handleChannelSwitch, isNavigationFromSource, isTabSelected, moveToTab, openedTabs, openStartupTabs, saveTabs, settings, setUpdaterFunction, useGhostTabs } from "@equicordplugins/channelTabs/util";
import { IS_MAC } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import { useForceUpdater } from "@utils/react";
import { findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { Button, ContextMenuApi, FluxDispatcher, useCallback, useEffect, useRef, UserStore, useState, useStateFromStores } from "@webpack/common";

import channelTabs from "..";
import BookmarkContainer, { HorizontalScroller } from "./BookmarkContainer";
import ChannelTab, { PreviewTab } from "./ChannelTab";
import { BasicContextMenu } from "./ContextMenus";

type TabSet = Record<string, ChannelTabsProps[]>;

const PlusSmallIcon = findComponentByCodeLazy("0v-5h5a1");
const ChannelRTCStore = findStoreLazy("ChannelRTCStore");

const cl = classNameFactory("vc-channeltabs-");

export default function ChannelsTabsContainer(props: BasicChannelTabsProps) {
    const [userId, setUserId] = useState("");
    const [tabsOverflow, setTabsOverflow] = useState(false);
    const {
        showBookmarkBar,
        widerTabsAndBookmarks,
        tabWidthScale,
        enableNumberKeySwitching,
        numberKeySwitchCount,
        enableCloseTabShortcut,
        enableNewTabShortcut,
        enableTabCycleShortcut,
        closeTabKeybind,
        newTabKeybind,
        cycleTabForwardKeybind,
        cycleTabBackwardKeybind,
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
        compactAutoExpandOnHover,
        newTabButtonBehavior
    } = settings.use([
        "showBookmarkBar",
        "widerTabsAndBookmarks",
        "tabWidthScale",
        "enableNumberKeySwitching",
        "numberKeySwitchCount",
        "enableCloseTabShortcut",
        "enableNewTabShortcut",
        "enableTabCycleShortcut",
        "closeTabKeybind",
        "newTabKeybind",
        "cycleTabForwardKeybind",
        "cycleTabBackwardKeybind",
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
        "compactAutoExpandOnHover",
        "newTabButtonBehavior"
    ]);
    const GhostTabs = useGhostTabs();
    const isFullscreen = useStateFromStores([ChannelRTCStore], () => ChannelRTCStore.isFullscreenInContext() ?? false);

    const _update = useForceUpdater();
    const update = useCallback((save = true) => {
        _update();
        if (save) saveTabs(userId);
    }, [userId]);

    const ref = useRef<HTMLDivElement>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);

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
                channelTabs.containerHeight = ref.current.clientHeight;
            } catch { }
        }
    }, [userId, showBookmarkBar, tabBarPosition]);

    useEffect(() => {
        _update();
    }, [widerTabsAndBookmarks]);
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;

        const checkOverflow = () => {
            if (!newTabButtonBehavior) {
                setTabsOverflow(true);
                return;
            }
            const overflow = scroller.scrollWidth > scroller.clientWidth;
            setTabsOverflow(overflow);
        };

        checkOverflow();

        const observer = new ResizeObserver(checkOverflow);
        observer.observe(scroller);

        return () => observer.disconnect();
    }, [openedTabs.length, newTabButtonBehavior]);

    useEffect(() => {
        const matchesKeybind = (event: KeyboardEvent, keybindString: string): boolean => {
            const parts = keybindString.split("+");
            const hasCtrl = parts.includes("CTRL");
            const hasShift = parts.includes("SHIFT");
            const hasAlt = parts.includes("ALT");
            const mainKey = parts[parts.length - 1].toLowerCase();

            const ctrlPressed = event.ctrlKey || event.metaKey;
            const shiftPressed = event.shiftKey;
            const altPressed = event.altKey;
            const keyPressed = event.key.toLowerCase();

            // special handling for TAB key
            if (mainKey === "tab") {
                return hasCtrl === ctrlPressed && hasShift === shiftPressed && hasAlt === altPressed && keyPressed === "tab";
            }

            // special handling for SPACE
            if (mainKey === "space") {
                return hasCtrl === ctrlPressed && hasShift === shiftPressed && hasAlt === altPressed && keyPressed === " ";
            }

            return hasCtrl === ctrlPressed && hasShift === shiftPressed && hasAlt === altPressed && keyPressed === mainKey;
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;

            // skip if typing in input fields
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }

            // 1. number key switching (1-9)
            if (enableNumberKeySwitching) {
                const keyNumber = parseInt(event.key, 10);
                if (!isNaN(keyNumber) && keyNumber >= 1 && keyNumber <= numberKeySwitchCount) {
                    const tabIndex = keyNumber - 1;
                    if (openedTabs[tabIndex]) {
                        event.preventDefault();
                        moveToTab(openedTabs[tabIndex].id);
                        return;
                    }
                }
            }

            // 2. close tab shortcut (default: CTRL+W)
            if (enableCloseTabShortcut && matchesKeybind(event, closeTabKeybind)) {
                event.preventDefault();
                const currentTab = openedTabs.find(t => isTabSelected(t.id));
                if (currentTab && openedTabs.length > 1) {
                    closeTab(currentTab.id);
                }
                return;
            }

            // 3. new tab shortcut (default: CTRL+T)
            if (enableNewTabShortcut && matchesKeybind(event, newTabKeybind)) {
                event.preventDefault();
                event.stopPropagation(); // prevent discord's quick switcher from seeing this
                createTab(props, true);
                return;
            }

            // 4. cycle tabs forward (default: CTRL+TAB)
            if (enableTabCycleShortcut && matchesKeybind(event, cycleTabForwardKeybind)) {
                event.preventDefault();
                event.stopPropagation(); // prevent discord's guild switcher from seeing this
                const currentIndex = openedTabs.findIndex(t => isTabSelected(t.id));
                if (currentIndex !== -1 && openedTabs.length > 1) {
                    const nextIndex = (currentIndex + 1) % openedTabs.length;
                    moveToTab(openedTabs[nextIndex].id);
                }
                return;
            }

            // 5. cycle tabs backward (default: CTRL+SHIFT+TAB)
            if (enableTabCycleShortcut && matchesKeybind(event, cycleTabBackwardKeybind)) {
                event.preventDefault();
                event.stopPropagation(); // prevent Discord's guild switcher from seeing this
                const currentIndex = openedTabs.findIndex(t => isTabSelected(t.id));
                if (currentIndex !== -1 && openedTabs.length > 1) {
                    const nextIndex = (currentIndex - 1 + openedTabs.length) % openedTabs.length;
                    moveToTab(openedTabs[nextIndex].id);
                }
                return;
            }
        };

        document.addEventListener("keydown", handleKeyDown, true);

        return () => {
            document.removeEventListener("keydown", handleKeyDown, true);
        };
    }, [
        enableNumberKeySwitching,
        numberKeySwitchCount,
        enableCloseTabShortcut,
        closeTabKeybind,
        enableNewTabShortcut,
        newTabKeybind,
        enableTabCycleShortcut,
        cycleTabForwardKeybind,
        cycleTabBackwardKeybind,
        props,
        openedTabs
    ]);

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
                <HorizontalScroller
                    customRef={node => { scrollerRef.current = node; }}
                    className={cl("tab-scroller", newTabButtonBehavior && !tabsOverflow && "tab-scroller-following")}
                >
                    {openedTabs.filter(tab => tab != null).map((tab, i) =>
                        <ChannelTab {...tab} index={i} key={tab.id} />
                    )}
                </HorizontalScroller>

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

export function ChannelTabsPreview(p: { setValue: (v: TabSet) => void; }) {
    const id = UserStore.getCurrentUser()?.id;
    if (!id) return <Paragraph>there's no logged in account?????</Paragraph>;

    const { setValue } = p;
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
