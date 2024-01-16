/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import definePlugin from "@utils/types";
import { Message } from "discord-types/general";

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    channelId: string;
    message: Message;
}

var fxtwtListener;

export default definePlugin({
    name: "FXTwitter",
    description: "Automatically replaces x.com and twitter.com links with fxtwitter links.",
    authors: [
        {
            id: 541332458801725460n,
            name: "PinkSickle",
        },
    ],

    start() {

        const twregex = /https:\/\/twitter\.com/;
        const xregex = /https:\/\/x\.com/;

        fxtwtListener = addPreSendListener((_, ctx) => {
            // console.log(ctx);
            ctx.content = ctx.content.replace(twregex, "https://fxtwitter.com");
            ctx.content = ctx.content.replace(xregex, "https://fxtwitter.com");
        });
    },
    stop() {
        removePreSendListener(fxtwtListener);
    }
});
