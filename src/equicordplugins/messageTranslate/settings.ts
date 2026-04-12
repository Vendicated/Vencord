/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    targetLanguage: {
        type: OptionType.STRING,
        description: "Target language code for translations (e.g. en, es, fr, de, ja).",
        default: "en",
    },
    confidenceRequirement: {
        type: OptionType.NUMBER,
        description: "Minimum confidence (0 to 1) required to show a translation.",
        default: 0.8,
    },
    autoTranslate: {
        type: OptionType.BOOLEAN,
        description: "Automatically translate messages as they appear.",
        default: true,
    },
    skipOwnMessages: {
        type: OptionType.BOOLEAN,
        description: "Do not translate your own messages.",
        default: true,
    },
    skipBotMessages: {
        type: OptionType.BOOLEAN,
        description: "Do not translate bot messages.",
        default: false,
    },
    ignoredGuilds: {
        type: OptionType.STRING,
        description: "Comma-separated list of server IDs to not translate in.",
        default: "",
    },
    ignoredChannels: {
        type: OptionType.STRING,
        description: "Comma-separated list of channel IDs to not translate in.",
        default: "",
    },
    ignoredUsers: {
        type: OptionType.STRING,
        description: "Comma-separated list of user IDs to not translate.",
        default: "",
    },
    showIndicator: {
        type: OptionType.BOOLEAN,
        description: "Append a small (translated) indicator to translated messages.",
        default: true,
    },
});

function parseIdList(value: string): Set<string> {
    return new Set(value.split(",").map(s => s.trim()).filter(Boolean));
}

export function getIgnoredGuilds(): Set<string> {
    return parseIdList(settings.store.ignoredGuilds);
}

export function getIgnoredChannels(): Set<string> {
    return parseIdList(settings.store.ignoredChannels);
}

export function getIgnoredUsers(): Set<string> {
    return parseIdList(settings.store.ignoredUsers);
}
