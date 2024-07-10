/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    ApplicationCommandInputType,
    ApplicationCommandOptionType,
    registerCommand,
    sendBotMessage,
} from "@api/Commands";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { updateMessage } from "@api/MessageUpdater";
import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { MessageCache } from "@webpack/common";
import { Message } from "discord-types/general";

const Native = VencordNative.pluginHelpers.GPGEncryption as PluginNative<
    typeof import("./native")
>;

let isActive = false;

const containsPGPMessage = (text: string): boolean => {
    const pgpMessageRegex =
        /-----BEGIN PGP MESSAGE-----(.*)-----END PGP MESSAGE-----/s;
    return pgpMessageRegex.test(text);
};

const decryptPgpMessages = async (channelId: string) => {
    try {
        let cache = MessageCache.getOrCreate(channelId);

        const messages: Message[] = cache.toArray();
        const pgp: Message[] = [];

        for (let m of messages) {
            if (containsPGPMessage(m.content)) {
                pgp.push(m);
                updateMessage(channelId, m.id, {
                    content: "*Encrypted Message - pending decription...*",
                });
            }
        }

        for (let pgpMessage of pgp) {
            if (containsPGPMessage(pgpMessage.content)) {
                const content = await Native.decryptMessage(pgpMessage.content);
                console.log("decrypting message", pgpMessage.id);
                updateMessage(channelId, pgpMessage.id, {
                    content,
                });
            }
        }
    } catch (e) {
        console.log(e);
    }
};

export default definePlugin({
    name: "GPGEncryption",
    description:
        "Allows you to send GPG encrypted messages to other users with the plugin",
    authors: [Devs.zoeycodes, Devs.jg],
    dependencies: ["MessageEventsAPI"],

    flux: {
        MESSAGE_CREATE: async (event) => {
            decryptPgpMessages(event.message.channel_id);
        },
        CHANNEL_SELECT: async (event) => {
            decryptPgpMessages(event.channelId);
        },
        LOAD_MESSAGES_SUCCESS: async (event) => {
            decryptPgpMessages(event.channelId);
        },
    },

    start() {
        try {
            this.preSend = addPreSendListener(async (channelId, msg) => {
                this.channelId = channelId;
                if (!isActive) return;
                try {
                    const stdout = await Native.encryptMessage(msg.content);

                    msg.content = stdout;
                } catch (e) {
                    console.log("gpg error");
                }
            });
        } catch (e) {
            console.log(e);
        }

        try {
            registerCommand(
                {
                    name: "gpg",
                    description: "Toggle GPG Encryption on and off",
                    inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
                    options: [
                        {
                            required: true,
                            name: "on or off",
                            type: ApplicationCommandOptionType.STRING,
                            description: "On or off",
                        },
                    ],
                    execute: async (args, ctx) => {
                        switch (args[0].value) {
                            case "on":
                                isActive = true;
                                return sendBotMessage(ctx.channel.id, {
                                    content: "GPG Enabled",
                                });
                            case "off":
                                isActive = false;
                                return sendBotMessage(ctx.channel.id, {
                                    content: "GPG Disabled",
                                });

                            default:
                                return sendBotMessage(ctx.channel.id, {
                                    content: "Invalid Selection",
                                });
                        }
                    },
                },
                "GPGEncryption",
            );
            registerCommand(
                {
                    name: "sharegpg",
                    description: "Share GPG Public Key",
                    inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
                    options: [
                        {
                            required: true,
                            name: "Key ID",
                            type: ApplicationCommandOptionType.STRING,
                            description: "ID of GPG key",
                        },
                    ],
                    execute: async (args, ctx) => {
                        let publicKey: string;
                        try {
                            publicKey = await Native.getPublicKey(
                                args[0].value,
                            );
                        } catch (e) {
                            publicKey = "";
                            console.error(e);
                        }
                        return {
                            content: publicKey,
                        };
                    },
                },
                "GPGEncryption",
            );
        } catch (e) {
            console.error(e);
        }
    },

    stop() {
        removePreSendListener(this.preSend);
    },
});
