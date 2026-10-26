/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelType, MessageType } from "@vencord/discord-types/enums";

import type { MentionContext } from "./policy";
import { isSnowflake } from "./preferences";

export interface ContextChannel {
    id: string;
    type: number;
    guild_id?: string;
    recipients?: readonly string[];
    isMessageRequest?: boolean;
    isSpam?: boolean;
    safetyWarnings?: readonly unknown[];
    isSystemDM?(): boolean;
    isThread(): boolean;
}

export interface ContextReaders {
    accountId(): unknown;
    channel(id: string): ContextChannel | undefined;
    roles(guildId: string, accountId: string): unknown;
    suppressEveryone(guildId: string): unknown;
    suppressRoles(guildId: string): unknown;
    referencedMessage?(channelId: string, messageId: string): unknown;
}

function object(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cachedReplyAuthor(data: Record<string, unknown>, guildId: string, readers: ContextReaders): string | undefined {
    if (data.type !== MessageType.REPLY || data.referenced_message !== undefined) return;
    const reference = data.message_reference ?? data.messageReference;
    if (!object(reference) || !isSnowflake(reference.message_id) || !isSnowflake(reference.channel_id) || reference.channel_id !== data.channel_id
        || (reference.guild_id !== undefined && reference.guild_id !== guildId)
        || (reference.type !== undefined && reference.type !== 0)) return;
    const parent = readers.referencedMessage?.(reference.channel_id, reference.message_id);
    if (!object(parent) || parent.id !== reference.message_id || parent.channel_id !== reference.channel_id
        || (parent.guild_id !== undefined && parent.guild_id !== guildId) || !object(parent.author)
        || !isSnowflake(parent.author.id)) return;
    return parent.author.id;
}

export function readContext(message: unknown, readers: ContextReaders): MentionContext | undefined {
    if (message === null || typeof message !== "object" || Array.isArray(message)) return;
    const data = message as Record<string, unknown>;
    // Native eligibility routes this system message through its parent, outside our captured context.
    if (data.type === MessageType.THREAD_STARTER_MESSAGE) return;
    if (!isSnowflake(data.channel_id)) return;
    const accountId = readers.accountId();
    if (!isSnowflake(accountId)) return;
    const channel = readers.channel(data.channel_id);
    if (!channel || channel.id !== data.channel_id || !Number.isInteger(channel.type) || channel.type < 0) return;
    if (channel.type === ChannelType.DM || channel.type === ChannelType.GROUP_DM) {
        if (channel.guild_id != null || data.guild_id != null || !object(data.author)
            || !isSnowflake(data.author.id) || data.author.id === accountId
            || !Array.isArray(channel.recipients) || !channel.recipients.every(isSnowflake) || !channel.recipients.includes(data.author.id)
            // The audited record leaves an absent message-request flag undefined, but defaults spam to false and warnings to [].
            || (channel.isMessageRequest !== undefined && channel.isMessageRequest !== false) || channel.isSpam !== false
            || !Array.isArray(channel.safetyWarnings) || channel.safetyWarnings.length !== 0
            || typeof channel.isSystemDM !== "function" || channel.isSystemDM() !== false
            || readers.accountId() !== accountId) return;
        return { scope: "dm", accountId, channelId: channel.id, guildId: undefined, ownRoleIds: [], suppressEveryone: false, suppressRoles: false };
    }
    if (!isSnowflake(channel.guild_id)
        || (data.guild_id !== undefined && data.guild_id !== channel.guild_id)) return;
    // The audited native thread branch ignores the server's broadcast/role suppression flags.
    const thread = channel.isThread();
    if (typeof thread !== "boolean") return;
    const suppressEveryone = thread ? false : readers.suppressEveryone(channel.guild_id);
    const suppressRoles = thread ? false : readers.suppressRoles(channel.guild_id);
    if (typeof suppressEveryone !== "boolean" || typeof suppressRoles !== "boolean") return;
    const roles = readers.roles(channel.guild_id, accountId);
    const ownRoleIds = Array.isArray(roles) && roles.every(isSnowflake) ? [...roles] as string[] : undefined;
    const cachedReplyAuthorId = cachedReplyAuthor(data, channel.guild_id, readers);
    if (readers.accountId() !== accountId) return;
    return {
        scope: "guild", accountId, channelId: channel.id, guildId: channel.guild_id, ownRoleIds, suppressEveryone, suppressRoles,
        ...(cachedReplyAuthorId ? { cachedReplyAuthorId } : {})
    };
}
