/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageObject } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"'>)|\]\s])/gi;
const X_HOSTS = new Set(["x.com", "www.x.com", "mobile.x.com", "m.x.com"]);

function rewriteXLinks(msg: MessageObject) {
    if (!/x\.com/i.test(msg.content)) return;

    msg.content = msg.content.replace(URL_REGEX, match => {
        let url: URL;
        try {
            url = new URL(match);
        } catch {
            return match;
        }

        if (!X_HOSTS.has(url.hostname)) return match;

        url.hostname = "fixupx.com";
        return url.toString();
    });
}

export default definePlugin({
    name: "FixupX",
    description: "Rewrite x.com links to fixupx.com before sending so embeds work properly.",
    authors: [Devs.haumlab],

    onBeforeMessageSend(_, msg) {
        rewriteXLinks(msg);
    },

    onBeforeMessageEdit(_channelId, _messageId, msg) {
        rewriteXLinks(msg);
    }
});
