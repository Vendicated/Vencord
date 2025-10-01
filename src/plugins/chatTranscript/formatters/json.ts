/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@vencord/discord-types";

import type { FormatOptions } from "../types";
import { getChannelDisplayName, sanitizeFilename } from "../utils";

interface JsonResult {
    content: string;
    mime: string;
    extension: string;
    filenameHint: string;
}

function buildJsonTranscript(messages: Message[], options: FormatOptions): JsonResult {
    const {
        channel,
        includeAttachments,
        includeEmbeds,
        includeReactions,
        includeEdits,
        includeMentions,
        includeReferenced
    } = options;

    const channelName = getChannelDisplayName(channel);

    const data = {
        channel: channel ? {
            id: channel.id,
            name: channel.name,
            type: channel.type,
            guild_id: channel.guild_id,
            displayName: channelName
        } : null,
        exportedAt: new Date().toISOString(),
        messageCount: messages.length,
        messages: messages.map(message => {
            const serialised: Record<string, unknown> = {
                id: message.id,
                timestamp: message.timestamp,
                type: message.type,
                pinned: message.pinned,
                content: message.content,
                channel_id: message.channel_id,
                guild_id: message.guild_id,
                author: {
                    id: message.author?.id,
                    username: message.author?.username,
                    globalName: message.author?.global_name,
                    discriminator: message.author?.discriminator,
                    bot: message.author?.bot,
                    avatar: message.author?.avatar
                },
                member: message.member ?? null
            };

            if (includeEdits) serialised.editedTimestamp = message.edited_timestamp;
            if (includeAttachments) serialised.attachments = message.attachments;
            if (includeEmbeds) serialised.embeds = message.embeds;
            if (includeReactions) serialised.reactions = message.reactions;
            if (includeMentions) {
                serialised.mentions = message.mentions;
                serialised.mention_roles = message.mention_roles;
            }
            if (includeReferenced) serialised.referencedMessage = message.referenced_message;

            return serialised;
        })
    };

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const rangeHint = `${firstMessage ? new Date(firstMessage.timestamp).toISOString() : "start"}_${lastMessage ? new Date(lastMessage.timestamp).toISOString() : "end"}`;
    const filenameHint = sanitizeFilename(`${channelName}_${rangeHint}`);

    return {
        content: JSON.stringify(data, null, 2),
        mime: "application/json;charset=utf-8",
        extension: "json",
        filenameHint
    };
}

export { buildJsonTranscript };

