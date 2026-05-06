/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    limit: {
        type: OptionType.SLIDER,
        description: "Maximum number of hits loaded per category in one request.",
        markers: [10, 15, 20, 25],
        default: 20,
        stickToMarkers: true
    },
    inlinePreviewLimit: {
        type: OptionType.SLIDER,
        description: "How many message hits to display directly on the All tab before the \"Show all\" button.",
        markers: [3, 5, 8, 10],
        default: 5,
        stickToMarkers: true
    },
    sortBy: {
        type: OptionType.SELECT,
        description: "Order results by newest first or by how closely they match your query.",
        options: [
            { label: "Most recent", value: "timestamp", default: true },
            { label: "Relevance", value: "relevance" }
        ]
    },
    showInlinePreview: {
        type: OptionType.BOOLEAN,
        description: "Show a preview of message hits inline on the All tab next to Discord's regular channel matches.",
        default: true
    },
    autoOpenMessagesTab: {
        type: OptionType.BOOLEAN,
        description: "Automatically switch to the Messages tab when your query has message hits but Discord found no channel matches.",
        default: false
    },
    keepOpenAfterJump: {
        type: OptionType.BOOLEAN,
        description: "Keep the Quick Switcher open after clicking a result instead of closing it. Lets you jump and keep browsing other hits.",
        default: false
    },
    restoreLastSession: {
        type: OptionType.BOOLEAN,
        description: "When you reopen the Quick Switcher, restore your last query, active tab, and results from the previous session.",
        default: false
    }
});
