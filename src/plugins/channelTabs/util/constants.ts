/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";

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
    }
});

export const { CircleQuestionIcon } = findByPropsLazy("CircleQuestionIcon");
