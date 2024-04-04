/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType } from "@api/Commands/types";
import { sendMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import { MessageActions } from "@webpack/common";
import { Message } from "discord-types/general";

export default definePlugin({
    name: "Sneakysend",
    description: "Allows you to send temporary messages",
    authors: [
        {
            id: 690944955857764393n,
            name: "Codemob",
        },
    ],
    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "sneakysend",
            description: "Sends a message that is deleted after a specific duration",
            options: [
                {
                    name: "message",
                    description: "The message to send",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "duration",
                    description: "How long before the message is deleted in milliseconds, defaults to 500 (half a second) if not specified.",
                    type: ApplicationCommandOptionType.INTEGER
                }
            ],
            execute: async (opts, cmdCtx) => {
                var message: Message = (await sendMessage(cmdCtx.channel.id, {
                    content: opts[0].value
                })).body;
                var timeout: number = opts[1] === undefined ? 500 : +opts[1].value;
                setTimeout(() => {
                    MessageActions.deleteMessage(message.channel_id, message.id);
                }, timeout);
            },
        },
    ],
    start() {
    },
    stop() {
    },
});
