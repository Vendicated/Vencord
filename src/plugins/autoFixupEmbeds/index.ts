/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageObject } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

type ReplacementRecords = Record<string, string>;

export default definePlugin({
    name: "AutoFixTwitterEmbeds",
    description: "Automatically rewrites on sent message that contains x.com or twitter.com links to fixupx.com and fxtwitter.com to fix broken Twitter embeds in Discord.",
    authors: [Devs.lpirito],

    start() { },

    replacements: {
        "x.com": "fixupx.com",
        "twitter.com": "fxtwitter.com"
    } as ReplacementRecords,

    onBeforeMessageSend(_, msg: MessageObject) {
        return this.onSend(msg);
    },

    onBeforeMessageEdit(_cid, _mid, msg: MessageObject) {
        return this.onSend(msg);
    },

    onSend(msg: MessageObject) {
        if (!msg?.content) return;

        let alreadyFixed = false;
        for (const [_, target] of Object.entries(this.replacements)) {
            if (msg.content.includes(target)) {
                alreadyFixed = true;
                break;
            }
        }
        if (alreadyFixed) return;

        for (const [source, target] of Object.entries(this.replacements)) {
            if (msg.content.includes(source)) {
                const escapedSource = source.replace(/\./g, "\\.");
                const regex = new RegExp(escapedSource, "g");
                msg.content = msg.content.replace(regex, target);
            }
        }
    }
});
