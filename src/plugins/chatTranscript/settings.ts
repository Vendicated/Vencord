/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

const settings = definePluginSettings({
    defaultFormat: {
        description: "Default export format when opening the transcript modal",
        type: OptionType.SELECT,
        options: [
            { label: "HTML (.html)", value: "html", default: true },
            { label: "Markdown (.md)", value: "markdown" },
            { label: "JSON (.json)", value: "json" }
        ]
    },
    defaultLimit: {
        description: "Default maximum number of messages to fetch for a transcript",
        type: OptionType.NUMBER,
        default: 500
    },
    includeBots: {
        description: "Include bot-authored messages by default",
        type: OptionType.BOOLEAN,
        default: true
    },
    includeSystem: {
        description: "Include system/service messages (pins, joins, boosts, etc.) by default",
        type: OptionType.BOOLEAN,
        default: false
    },
    includeAttachments: {
        description: "Include attachment metadata in exports by default",
        type: OptionType.BOOLEAN,
        default: true
    },
    includeEmbeds: {
        description: "Include embed summaries in exports by default",
        type: OptionType.BOOLEAN,
        default: true
    },
    includeReactions: {
        description: "Include reactions in exports by default",
        type: OptionType.BOOLEAN,
        default: true
    },
    includeEdits: {
        description: "Include edited timestamps in exports by default",
        type: OptionType.BOOLEAN,
        default: true
    },
    includeMentions: {
        description: "Include mention metadata in exports by default",
        type: OptionType.BOOLEAN,
        default: false
    },
    includeReferenced: {
        description: "Include reply context (referenced messages) by default",
        type: OptionType.BOOLEAN,
        default: true
    },
    groupByDay: {
        description: "Group HTML transcripts by day separators by default",
        type: OptionType.BOOLEAN,
        default: true
    }
});

export { settings };

