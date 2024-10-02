/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addPreSendListener, removePreSendListener, SendListener } from "@api/MessageEvents";
import { definePluginSettings, Settings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { MessageStore } from "@webpack/common";

import { transferMessage } from "./native";

const presendObject: SendListener = async (channelId, msg, extra) => {
    const messageRef = extra.replyOptions.messageReference;
    const repliedMessage = ((messageRef?.message_id && messageRef.channel_id) && MessageStore.getMessage(messageRef?.channel_id, messageRef?.message_id)) || undefined;
    msg.content = await transferMessage(msg, Settings.plugins.Shakespearean.model, repliedMessage);
};

export default definePlugin({
    name: "Shakespearean",
    description: "Makes every message you send shakespearean",
    authors: [EquicordDevs.vmohammad],
    dependencies: ["MessageEventsAPI"],
    settings: definePluginSettings(
        {
            model: {
                type: OptionType.STRING,
                description: "Which model to use for this... thing",
                default: "llama3"
            }
        }),
    start() {
        addPreSendListener(presendObject);
    },
    stop() {
        removePreSendListener(presendObject);
    }
});
