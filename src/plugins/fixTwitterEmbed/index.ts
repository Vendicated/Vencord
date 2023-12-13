/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    addPreEditListener,
    addPreSendListener,
    MessageObject,
    removePreSendListener,
} from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const urlRegex = /https:\/\/(?:twitter\.com|x\.com)\/([^/]+)\/status\/([^/]+)/;

export default definePlugin({
    name: "FixTwitterEmbed",
    description: "Fixes Twitter embeds by replacing them with fxtwitter links",
    authors: [Devs.smex],
    dependencies: ["MessageEventsAPI"],
    replacer(msg: MessageObject) {
        if (msg.content.match(urlRegex)) {
            msg.content = msg.content.replace(urlRegex, "https://fxtwitter.com/$1/status/$2");
        }
    },
    start() {
        this.preSendListener = addPreSendListener((_, msg) => this.replacer(msg));
        this.preEditListener = addPreEditListener((_, _mid, msg) => this.replacer(msg));
    },
    stop() {
        removePreSendListener(this.preSendListener);
        removePreSendListener(this.preEditListener);
    }
});
