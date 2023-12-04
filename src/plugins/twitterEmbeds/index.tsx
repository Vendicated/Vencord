/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 dragdotpng and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageObject } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";




export default definePlugin({
    name: "TwitterEmbeds",
    description: "Makes Twitter links actually embed",
    authors: [Devs.Drag],

    onSend(msg: MessageObject) {
        const twitterLinkRegex = /https?:\/\/twitter\.com\/\w+\/status\/\d+/;
        if (twitterLinkRegex.test(msg.content)) {
            msg.content = msg.content.replace("twitter.com", "fxtwitter.com");

            console.log(msg.content);
        }
    },



    start() {
    },

    stop() {
        console.log();
    }
});
