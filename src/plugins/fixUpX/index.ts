/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageObject } from "@api/MessageEvents";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "FixUpX",
    description: "Automatically replaces Twitter/X links with FixUpX",
    tags: ["Twitter", "X", "FixUpX", "Embed", "Fix"],

    // The authors of this plugin
    authors: [
        {
            id: 504147739131641857n,
            name: "Braydon (Rainnny)",
        },
    ],

    // The options for this plugin
    options: {
        match: {
            type: OptionType.STRING,
            description: "The regex to match for the replacement",
            default: "@?https://(twitter.com|x.com)/[^/]+/status/[^/]+"
        },
        replacementUrl: {
            type: OptionType.STRING,
            description: "The URL of the replacement image",
            default: "https://fixupx.com"
        },
    },

    // The patches for this plugin
    patches: [],

    onBeforeMessageSend(_, msg) {
        replaceLinks(msg);
    },

    onBeforeMessageEdit(_cid, _mid, msg) {
        replaceLinks(msg);
    },
});

/**
 * Replaces all links in the message with the replacement URL.
 *
 * @param msg the message to replace the links in
 */
function replaceLinks(msg: MessageObject) {
    if (!msg.content) return;
    const { match, replacementUrl } = Vencord.Settings.plugins.FixUpX;
    msg.content = msg.content.replace(new RegExp(match, "g"), match => {
        try {
            const url = new URL(match);
            const params = url.searchParams.toString();
            return `${replacementUrl}${url.pathname}${params ? `?${params}` : ""}`;
        } catch {
            return match;
        }
    });
}
