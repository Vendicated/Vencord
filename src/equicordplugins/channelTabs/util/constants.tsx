/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { ChannelTabsPreview } from "@equicordplugins/channelTabs/components/ChannelTabsContainer";
import { KeybindSettings } from "@equicordplugins/channelTabs/components/KeybindSettings";
import { Logger } from "@utils/Logger";
import { makeRange, OptionType } from "@utils/types";
import { SearchableSelect, useState } from "@webpack/common";
import { JSX } from "react";

interface DynamicDropdownSettingOption {
    label: string;
    value: string;
    selected: boolean;
}

function AnimationSettings(): JSX.Element {
    const animationOptions: DynamicDropdownSettingOption[] = [
        { label: "Tab Hover Effects (lift + scale)", value: "hover", selected: settings.store.animationHover },
        { label: "Selected Tab Lift Animation", value: "selection", selected: settings.store.animationSelection },
        { label: "Tab Drag & Drop (ghost + reorder)", value: "drag-drop", selected: settings.store.animationDragDrop },
        { label: "Tab Enter/Exit Slides (creation + closing)", value: "enter-exit", selected: settings.store.animationEnterExit },
        { label: "Icon Pop on Selection (icon scale-up)", value: "icon-pop", selected: settings.store.animationIconPop },
        { label: "Close Button Rotation", value: "close-rotation", selected: settings.store.animationCloseRotation },
        { label: "Plus Button Pulse", value: "plus-pulse", selected: settings.store.animationPlusPulse },
        { label: "Mention Badge Glow", value: "mention-glow", selected: settings.store.animationMentionGlow },
        { label: "Compact Mode Expansion", value: "compact-expand", selected: settings.store.animationCompactExpand },
        { label: "Selected Tab Blue Border", value: "selected-border", selected: settings.store.animationSelectedBorder },
        { label: "Selected Tab Background Color", value: "selected-background", selected: settings.store.animationSelectedBackground },
        { label: "Tab Shadow Effects", value: "tab-shadows", selected: settings.store.animationTabShadows },
        { label: "Tab Repositioning (smooth position changes)", value: "tab-positioning", selected: settings.store.animationTabPositioning },
        { label: "Resize Handle Fade", value: "resize-handle", selected: settings.store.animationResizeHandle },
        { label: "Active Quests Gradient", value: "quests-active", selected: settings.store.animationQuestsActive }
    ];

    const [currentValue, setCurrentValue] = useState(animationOptions.filter(option => option.selected));

    function updateSettingsTruthy(enabled: DynamicDropdownSettingOption[]) {
        const enabledValues = enabled.map(option => option.value);

        animationOptions.forEach(option => {
            option.selected = enabledValues.includes(option.value);
        });

        settings.store.animationHover = enabledValues.includes("hover");
        settings.store.animationSelection = enabledValues.includes("selection");
        settings.store.animationDragDrop = enabledValues.includes("drag-drop");
        settings.store.animationEnterExit = enabledValues.includes("enter-exit");
        settings.store.animationIconPop = enabledValues.includes("icon-pop");
        settings.store.animationCloseRotation = enabledValues.includes("close-rotation");
        settings.store.animationPlusPulse = enabledValues.includes("plus-pulse");
        settings.store.animationMentionGlow = enabledValues.includes("mention-glow");
        settings.store.animationCompactExpand = enabledValues.includes("compact-expand");
        settings.store.animationSelectedBorder = enabledValues.includes("selected-border");
        settings.store.animationSelectedBackground = enabledValues.includes("selected-background");
        settings.store.animationTabShadows = enabledValues.includes("tab-shadows");
        settings.store.animationTabPositioning = enabledValues.includes("tab-positioning");
        settings.store.animationResizeHandle = enabledValues.includes("resize-handle");
        settings.store.animationQuestsActive = enabledValues.includes("quests-active");

        setCurrentValue(enabled);
    }

    function handleChange(values: Array<DynamicDropdownSettingOption | string>) {
        if (values.length === 0) {
            updateSettingsTruthy([]);
            return;
        }

        const stringlessValues = values.filter(v => typeof v !== "string") as DynamicDropdownSettingOption[];
        const selectedOption = values.find(v => typeof v === "string") as string;
        const option = animationOptions.find(option => option.value === selectedOption) as DynamicDropdownSettingOption;

        if (option.selected) {
            updateSettingsTruthy(stringlessValues.filter(v => v.value !== selectedOption));
        } else {
            updateSettingsTruthy([...stringlessValues, option]);
        }
    }

    return (
        <section>
            <Heading>Animation Controls</Heading>
            <Paragraph>
                Enable or disable specific animations for channel tabs. Each option can be toggled independently.
            </Paragraph>
            <div style={{ marginTop: "8px" }}>
                <SearchableSelect
                    placeholder="Select which animations to enable..."
                    maxVisibleItems={12}
                    clearable={true}
                    multi={true}
                    value={currentValue as any}
                    options={animationOptions}
                    onChange={handleChange}
                    closeOnSelect={false}
                />
            </div>
        </section>
    );
}

export const logger = new Logger("ChannelTabs");

export const bookmarkFolderColors = {
    Red: "var(--channeltabs-red)",
    Blue: "var(--channeltabs-blue)",
    Yellow: "var(--channeltabs-yellow)",
    Green: "var(--channeltabs-green)",
    Black: "var(--channeltabs-black)",
    White: "var(--channeltabs-white)",
    Orange: "var(--channeltabs-orange)",
    Pink: "var(--channeltabs-pink)"
} as const;

export const settings = definePluginSettings({
    onStartup: {
        type: OptionType.SELECT,
        description: "On startup",
        options: [{
            label: "Do nothing (open on the friends tab)",
            value: "nothing",
            default: true
        }, {
            label: "Remember tabs from last session",
            value: "remember"
        }, {
            label: "Open on a specific set of tabs",
            value: "preset"
        }],
    },
    tabSet: {
        component: ChannelTabsPreview,
        type: OptionType.COMPONENT,
        default: {}
    },
    noPomeloNames: {
        description: "Use display names instead of usernames for DM's",
        type: OptionType.BOOLEAN,
        default: false
    },
    showStatusIndicators: {
        description: "Show status indicators for DM's",
        type: OptionType.BOOLEAN,
        default: true
    },
    showBookmarkBar: {
        description: "",
        type: OptionType.BOOLEAN,
        default: true
    },
    bookmarkNotificationDot: {
        description: "Show notification dot for bookmarks",
        type: OptionType.BOOLEAN,
        default: true
    },
    widerTabsAndBookmarks: {
        description: "Extend the length of tabs and bookmarks for larger monitors",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    },
    tabWidthScale: {
        type: OptionType.NUMBER,
        description: "Tab width scale (percentage) - adjustable by dragging tab edges",
        default: 100,
        hidden: true,
        restartNeeded: false
    },
    renderAllTabs: {
        type: OptionType.BOOLEAN,
        description: "Keep all tabs cached in memory for faster switching (caches scroll position and state)",
        default: false,
        restartNeeded: false
    },
    switchToExistingTab: {
        type: OptionType.BOOLEAN,
        description: "Switch to tab if it already exists for the channel you're navigating to",
        default: false,
        restartNeeded: false
    },
    createNewTabIfNotExists: {
        type: OptionType.BOOLEAN,
        description: "Create a new tab if one doesn't exist for the channel you're navigating to",
        default: false,
        restartNeeded: false
    },
    enableRapidNavigation: {
        type: OptionType.BOOLEAN,
        description: "Enable rapid navigation behavior - quickly navigating between channels will replace the current tab instead of creating new ones",
        default: false,
        restartNeeded: false
    },
    rapidNavigationThreshold: {
        type: OptionType.SLIDER,
        description: "Time window (in seconds) for rapid navigation. Within this time, new channels replace the current tab instead of creating new ones.",
        markers: [1, 2, 3, 5, 10, 20, 30, 40, 50, 60],
        default: 3,
        stickToMarkers: false,
    },
    tabBarPosition: {
        type: OptionType.SELECT,
        description: "Where to show the tab bar.",
        options: [
            { label: "Top", value: "top", default: true },
            { label: "Bottom", value: "bottom" }
        ],
        restartNeeded: true
    },
    enableNumberKeySwitching: {
        type: OptionType.BOOLEAN,
        description: "Enable number keys (1-9) to switch tabs",
        default: true,
        restartNeeded: false
    },
    numberKeySwitchCount: {
        type: OptionType.SLIDER,
        description: "Number of tabs accessible via number keys (1-9)",
        markers: makeRange(1, 9, 1),
        default: 3,
        stickToMarkers: true,
    },
    enableCloseTabShortcut: {
        type: OptionType.BOOLEAN,
        description: "Enable close tab keyboard shortcut",
        default: true,
        restartNeeded: false
    },
    enableNewTabShortcut: {
        type: OptionType.BOOLEAN,
        description: "Enable new tab keyboard shortcut",
        default: true,
        restartNeeded: false
    },
    enableTabCycleShortcut: {
        type: OptionType.BOOLEAN,
        description: "Enable tab cycling keyboard shortcut",
        default: true,
        restartNeeded: false
    },
    keybindsSection: {
        type: OptionType.COMPONENT,
        component: KeybindSettings
    },
    // me when storage yes for keybinds
    closeTabKeybind: {
        type: OptionType.STRING,
        description: "Keyboard shortcut to close the current tab",
        default: "CTRL+W",
        hidden: true
    },
    newTabKeybind: {
        type: OptionType.STRING,
        description: "Keyboard shortcut to open a new tab",
        default: "CTRL+T",
        hidden: true
    },
    cycleTabForwardKeybind: {
        type: OptionType.STRING,
        description: "Keyboard shortcut to cycle to the next tab",
        default: "CTRL+TAB",
        hidden: true
    },
    cycleTabBackwardKeybind: {
        type: OptionType.STRING,
        description: "Keyboard shortcut to cycle to the previous tab",
        default: "CTRL+SHIFT+TAB",
        hidden: true
    },
    showTabNumbers: {
        type: OptionType.BOOLEAN,
        description: "Show numbered badges on tabs to indicate keyboard shortcuts",
        default: false,
        restartNeeded: false
    },
    tabNumberPosition: {
        type: OptionType.SELECT,
        description: "Where to display the numbered badge on tabs",
        options: [
            { label: "Left side (before icon)", value: "left", default: true },
            { label: "Right side (after content)", value: "right" }
        ],
        restartNeeded: false
    },
    animations: {
        type: OptionType.COMPONENT,
        component: AnimationSettings
    },
    // me when storage yes
    animationHover: {
        type: OptionType.BOOLEAN,
        description: "Enable hover lift and scale effects",
        default: true,
        hidden: true
    },
    animationSelection: {
        type: OptionType.BOOLEAN,
        description: "Enable selection animations (border glow, lift)",
        default: true,
        hidden: true
    },
    animationDragDrop: {
        type: OptionType.BOOLEAN,
        description: "Enable drag and drop ghost effects",
        default: true,
        hidden: true
    },
    animationEnterExit: {
        type: OptionType.BOOLEAN,
        description: "Enable tab creation/closing slide animations",
        default: true,
        hidden: true
    },
    animationIconPop: {
        type: OptionType.BOOLEAN,
        description: "Enable icon scale-up animation on selection",
        default: true,
        hidden: true
    },
    animationCloseRotation: {
        type: OptionType.BOOLEAN,
        description: "Enable rotation animation for close buttons",
        default: true,
        hidden: true
    },
    animationPlusPulse: {
        type: OptionType.BOOLEAN,
        description: "Enable pulse animation for plus button",
        default: true,
        hidden: true
    },
    animationMentionGlow: {
        type: OptionType.BOOLEAN,
        description: "Enable pulsing red glow for mentions",
        default: true,
        hidden: true
    },
    animationCompactExpand: {
        type: OptionType.BOOLEAN,
        description: "Enable smooth expansion for compact tabs",
        default: true,
        hidden: true
    },
    animationSelectedBorder: {
        type: OptionType.BOOLEAN,
        description: "Enable border and glow styling for selected tabs",
        default: true,
        hidden: true
    },
    animationSelectedBackground: {
        type: OptionType.BOOLEAN,
        description: "Enable background color change for selected tabs",
        default: true,
        hidden: true
    },
    animationTabShadows: {
        type: OptionType.BOOLEAN,
        description: "Enable shadow effects on tabs",
        default: true,
        hidden: true
    },
    animationTabPositioning: {
        type: OptionType.BOOLEAN,
        description: "Enable smooth transitions when tabs move positions",
        default: true,
        hidden: true
    },
    animationResizeHandle: {
        type: OptionType.BOOLEAN,
        description: "Enable fade animation for resize handle",
        default: true,
        hidden: true
    },
    animationQuestsActive: {
        type: OptionType.BOOLEAN,
        description: "Enable gradient animations on Quests tab when quests are actively running",
        default: true,
        hidden: true
    },
    compactAutoExpandSelected: {
        type: OptionType.BOOLEAN,
        description: "Automatically expand compact tabs when selected to show the full channel name",
        default: true,
        restartNeeded: false
    },
    compactAutoExpandOnHover: {
        type: OptionType.BOOLEAN,
        description: "Automatically expand compact tabs on hover to show the full channel name",
        default: true,
        restartNeeded: false
    },
    openInNewTabAutoSwitch: {
        type: OptionType.BOOLEAN,
        description: "Automatically switch to new tabs opened from 'Open in New Tab' context menu",
        default: true,
        restartNeeded: false
    },
    bookmarksIndependentFromTabs: {
        type: OptionType.BOOLEAN,
        description: "Bookmarks navigate independently without affecting the active tabs bar",
        default: true,
        restartNeeded: false
    },
    showResizeHandle: {
        type: OptionType.BOOLEAN,
        description: "Show resize handle when hovering over tabs to adjust tab width",
        default: true,
        restartNeeded: false
    },
    openNewTabsInCompactMode: {
        type: OptionType.BOOLEAN,
        description: "Open all newly created tabs in compact mode by default",
        default: false,
        restartNeeded: false
    },
    newTabButtonBehavior: {
        type: OptionType.BOOLEAN,
        description: "New tab (+) button follows tabs instead of staying pinned to the right",
        default: true,
        restartNeeded: false
    },
    oneTabPerServer: {
        type: OptionType.BOOLEAN,
        description: "Limit to one tab per server, so opening a new channel in that server will use the existing tab.",
        default: false,
        restartNeeded: false
    },
    maxOpenTabs: {
        type: OptionType.SLIDER,
        description: "Maximum number of open tabs (0 = unlimited)",
        markers: makeRange(0, 20, 1),
        default: 0,
        stickToMarkers: true,
        restartNeeded: false
    }
});
