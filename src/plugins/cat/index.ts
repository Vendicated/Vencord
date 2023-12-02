/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 dragdotpng and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";
const MessageCreator = findByPropsLazy("getSendMessageOptionsForReply", "sendMessage");
const PendingReplyStore = findByPropsLazy("getPendingReply");


function sendMessage(channelId, message) {
    message = {
        // The following are required to prevent Discord from throwing an error
        invalidEmojis: [],
        tts: false,
        validNonShortcutEmojis: [],
        ...message
    };
    const reply = PendingReplyStore.getPendingReply(channelId);
    MessageCreator.sendMessage(channelId, message, void 0, MessageCreator.getSendMessageOptionsForReply(reply))
        .then(() => {
            if (reply) {
                FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
            }
        });
}

export default definePlugin({
    name: "Cat",
    description: "send a picture of a cat",
    authors: [Devs.Drag],

    commands: [
        {
            name: "cat",
            description: "Sends a picture of a cat",
            inputType: ApplicationCommandInputType.BOT,
            execute: async (args, ctx) => {
                const body = await fetch("https://api.thecatapi.com/v1/images/search").then(res => res.json());
                if (Array.isArray(body) && body.length > 0) {
                    const catUrl = body[0].url;
                    sendMessage(ctx.channel.id, {
                        content: catUrl,
                    });
                } else {
                    console.error("Unexpected response from the API:", body);
                }
            },
        },
    ],
});
