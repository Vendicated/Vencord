/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageObject } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    twitter: {
        type: OptionType.BOOLEAN,
        description: "Fix Twitter/X embeds (twitter.com → fxtwitter.com, x.com → fixupx.com)",
        default: true,
    },
    reddit: {
        type: OptionType.BOOLEAN,
        description: "Fix Reddit embeds (reddit.com → vxreddit.com)",
        default: true,
    },
    tiktok: {
        type: OptionType.BOOLEAN,
        description: "Fix TikTok embeds (tiktok.com → tnktok.com)",
        default: true,
    },
    bluesky: {
        type: OptionType.BOOLEAN,
        description: "Fix Bluesky embeds (bsky.app → fxbsky.app)",
        default: true,
    },
});

interface Replacement {
    pattern: RegExp;
    replacement: string;
    setting: keyof typeof settings["store"];
}

const replacements: Replacement[] = [
    {
        pattern: /https?:\/\/(www\.|mobile\.)?twitter\.com\//gi,
        replacement: "https://fxtwitter.com/",
        setting: "twitter",
    },
    {
        pattern: /https?:\/\/(www\.)?x\.com\//gi,
        replacement: "https://fixupx.com/",
        setting: "twitter",
    },
    {
        pattern: /https?:\/\/(www\.|old\.|new\.)?reddit\.com\//gi,
        replacement: "https://vxreddit.com/",
        setting: "reddit",
    },
    {
        pattern: /https?:\/\/(www\.|vm\.)?tiktok\.com\//gi,
        replacement: "https://tnktok.com/",
        setting: "tiktok",
    },
    {
        pattern: /https?:\/\/(www\.)?bsky\.app\//gi,
        replacement: "https://fxbsky.app/",
        setting: "bluesky",
    },
];

function replaceLinks(msg: MessageObject) {
    if (!msg.content) return;

    for (const { pattern, replacement, setting } of replacements) {
        if (!settings.store[setting]) continue;
        // Reset lastIndex since regexes have the global flag
        pattern.lastIndex = 0;
        msg.content = msg.content.replace(pattern, replacement);
    }
}

export default definePlugin({
    name: "FixSocialEmbeds",
    description: "Fixes broken social media embeds by replacing links with embed-friendly alternatives (FxTwitter, vxReddit, fxTikTok, FxBluesky)",
    authors: [Devs.sevenVex],
    settings,

    onBeforeMessageSend(_channelId, msg) {
        replaceLinks(msg);
    },

    onBeforeMessageEdit(_channelId, _messageId, msg) {
        replaceLinks(msg);
    },
});
