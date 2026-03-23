/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageObject } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

// Match twitter.com and x.com links (including www. and mobile. prefixes)
const twitterRegex = /https?:\/\/(www\.|mobile\.)?twitter\.com\//gi;
const xRegex = /https?:\/\/(www\.)?x\.com\//gi;

function replaceLinks(msg: MessageObject) {
    if (!msg.content) return;

    // twitter.com -> fxtwitter.com
    msg.content = msg.content.replace(twitterRegex, "https://fxtwitter.com/");

    // x.com -> fixupx.com
    msg.content = msg.content.replace(xRegex, "https://fixupx.com/");
}

export default definePlugin({
    name: "FxTwitter Links",
    description: "Automatically replaces twitter.com links with fxtwitter.com and x.com links with fixupx.com for better embeds",
    authors: [Devs.sevenVex],

    onBeforeMessageSend(_channelId, msg) {
        replaceLinks(msg);
    },

    onBeforeMessageEdit(_channelId, _messageId, msg) {
        replaceLinks(msg);
    },
});
