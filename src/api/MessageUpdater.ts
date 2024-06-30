/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { MessageRecord, MessageRecordOwnProperties } from "@vencord/discord-types";
import { ChannelMessages, MessageStore } from "@webpack/common";

/**
 * Update and re-render a message
 * @param channelId The channel id of the message
 * @param messageId The message id
 * @param properties The properties of the message to change. Leave empty if you just want to re-render
 */
export function updateMessage(channelId: string, messageId: string, properties?: Partial<MessageRecordOwnProperties>) {
    const channelMessages = ChannelMessages.getOrCreate(channelId);
    if (!channelMessages.has(messageId)) return;

    // To cause a message to re-render, we basically need to create a new instance of the message and obtain a new reference
    // If we have properties to modify we can use the merge method of the class, otherwise we just create a new instance with the old properties
    const newChannelMessages = channelMessages.update(messageId, (oldMessage: MessageRecord) => {
        return properties ? oldMessage.merge(properties) : new (oldMessage.constructor as typeof MessageRecord)(oldMessage);
    });

    ChannelMessages.commit(newChannelMessages);
    MessageStore.emitChange();
}
