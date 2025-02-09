/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, MessageActions, MessageStore, UserStore } from "@webpack/common";
import { Channel, Message } from "discord-types/general";

function shouldEdit(channel: Channel, message: Message, timePeriod: number) {
    let should = true;

    if (channel.isGroupDM()) {
        if (channel.name === message.content) {
            should = false;
        }
    }

    if (message.author.id !== UserStore.getCurrentUser().id) {
        should = false;
    }

    // @ts-ignore
    const timestamp = new Date(message.timestamp);
    const now = new Date();

    if ((now.getTime() - timestamp.getTime()) > (timePeriod * 1000)) {
        should = false;
    }

    return {
        should: should,
        content: message.content
    };
}

export default definePlugin({
    name: "MessageBurst",
    description: "Merges messages sent within a time period with your previous sent message if no one else sends a message before you.",
    authors: [EquicordDevs.port22exposed],
    settings: definePluginSettings({
        timePeriod: {
            type: OptionType.NUMBER,
            description: "The duration of bursts (in seconds).",
            default: 3
        }
    }),
    onBeforeMessageSend(channelId, message) {
        const messages = MessageStore.getMessages(channelId)._map;

        if (!messages) {
            return;
        }

        const entries = Object.entries(messages);
        const [lastMessageId, lastMessage] = entries[entries.length - 1];

        const channel = ChannelStore.getChannel(channelId);

        const { should, content } = shouldEdit(channel, lastMessage as Message, this.settings.store.timePeriod);

        console.log(should, content, this.settings.store.timePeriod);

        if (should) {
            MessageActions.editMessage(channelId, lastMessageId, {
                content: `${content}\n${message.content}`
            });
            message.content = "";
        }
    },
});
