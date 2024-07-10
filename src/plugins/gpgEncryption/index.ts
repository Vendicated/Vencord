/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { updateMessage } from "@api/MessageUpdater";
import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { MessageCache } from "@webpack/common";
import { Message } from "discord-types/general";

const Native = VencordNative.pluginHelpers.GPGEncryption as PluginNative<
    typeof import("./native")
>;

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
    authors: [Devs.zoeycodes],
    dependencies: ["MessageEventsAPI"],

    flux: {
        MESSAGE_CREATE: async (p) => {
            decryptPgpMessages(p.message.channel_id);
        },
        CHANNEL_SELECT: async (p) => {
            decryptPgpMessages(p.channelId);
        },
        LOAD_MESSAGES_SUCCESS: async (p) => {
            decryptPgpMessages(p.channelId);
        },
    },

    start() {
        try {
            this.preSend = addPreSendListener(async (channelId, msg) => {
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
    },

    stop() {
        removePreSendListener(this.preSend);
    },
});
