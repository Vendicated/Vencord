/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";

import { ChannelTabsPreview } from "../components/ChannelTabsContainer";

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
        description: "Select which tabs to open at startup",
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
        description: "Time window (in milliseconds) for rapid navigation. Within this time, new channels replace the current tab instead of creating new ones.",
        markers: [500, 1000, 1500, 2000, 3000, 5000, 10000],
        default: 3000,
        stickToMarkers: false,
    },
    tabBarPosition: {
        type: OptionType.SELECT,
        description: "Where to show the tab bar.",
        options: [
            { label: "Top", value: "top", default: true },
            { label: "Bottom", value: "bottom" }
        ],
    },
    enableHotkeys: {
        type: OptionType.BOOLEAN,
        description: "Enable hotkey (1-9) for tab switching",
        default: true,
        restartNeeded: false
    },
    hotkeyCount: {
        type: OptionType.SLIDER,
        description: "Number of tabs accessible via keyboard shortcuts",
        markers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        default: 3,
        stickToMarkers: true,
    }
});

export const CircleQuestionIcon = findComponentByCodeLazy("10.58l-3.3-3.3a1");
