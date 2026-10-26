/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isOptions, isSnowflake, Options } from "./preferences";

export interface MentionContext {
    scope: "guild" | "dm";
    accountId: string;
    channelId: string;
    guildId: string | undefined;
    ownRoleIds: readonly string[] | undefined;
    suppressEveryone: boolean;
    suppressRoles: boolean;
    cachedReplyAuthorId?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readIds(value: unknown): readonly string[] | undefined {
    if (!Array.isArray(value)) return;
    const entries: readonly unknown[] = value;
    return entries.every(isSnowflake) ? entries : undefined;
}

function isUserMention(value: unknown): value is { id: string; } {
    return isObject(value) && isSnowflake(value.id);
}

function readPersonalMentions(value: unknown): readonly string[] | undefined {
    const ids = readIds(value);
    if (ids) return ids;
    if (!Array.isArray(value)) return;
    const entries: readonly unknown[] = value;
    return entries.every(isUserMention) ? entries.map(mention => mention.id) : undefined;
}

const REPLY_MESSAGE_TYPE = 19;
const THREAD_STARTER_MESSAGE_TYPE = 21;
type ReplyTarget = "self" | "other" | "unknown" | "invalid";

interface ReplyReference {
    messageId: string;
    channelId: string;
}

function readReplyReference(value: unknown, context: MentionContext): ReplyReference | undefined {
    if (!isObject(value) || !isSnowflake(value.message_id) || value.channel_id !== context.channelId
        || (value.guild_id !== undefined && value.guild_id !== context.guildId)
        || (value.type !== undefined && value.type !== 0)) return;
    return { messageId: value.message_id, channelId: value.channel_id };
}

function readReplyTarget(message: Record<string, unknown>, context: MentionContext): ReplyTarget {
    const rawReference = message.message_reference;
    const recordReference = message.messageReference;
    const raw = rawReference == null ? undefined : readReplyReference(rawReference, context);
    const record = recordReference == null ? undefined : readReplyReference(recordReference, context);
    if ((rawReference != null && !raw) || (recordReference != null && !record)) return "invalid";
    if (raw && record && (raw.messageId !== record.messageId || raw.channelId !== record.channelId)) return "invalid";
    const reference = raw ?? record;
    if (!reference) return "unknown";
    const cachedAuthor = context.cachedReplyAuthorId;
    if (cachedAuthor !== undefined && !isSnowflake(cachedAuthor)) return "invalid";
    const embedded = message.referenced_message;
    // An explicit deleted parent is not made known again by an older local cache entry.
    if (embedded === null) return "unknown";
    if (embedded === undefined) return cachedAuthor === undefined ? "unknown" : cachedAuthor === context.accountId ? "self" : "other";
    if (!isObject(embedded) || embedded.id !== reference.messageId || embedded.channel_id !== reference.channelId
        || (embedded.guild_id !== undefined && embedded.guild_id !== context.guildId) || !isUserMention(embedded.author))
        return "invalid";
    if (cachedAuthor !== undefined && embedded.author.id !== cachedAuthor) return "invalid";
    return embedded.author.id === context.accountId ? "self" : "other";
}

export function shouldSuppress(message: unknown, context: MentionContext, options: Options): boolean {
    try {
        if (!isOptions(options) || options.paused || (!options.suppressEveryone && !options.suppressPersonal && !options.suppressDirectMessages && !options.suppressReplies && !options.suppressRoles))
            return false;
        if (!isSnowflake(context.accountId) || !isSnowflake(context.channelId)
            || typeof context.suppressEveryone !== "boolean" || typeof context.suppressRoles !== "boolean")
            return false;
        if (!isObject(message) || !isSnowflake(message.id) || message.channel_id !== context.channelId)
            return false;
        if (message.type === THREAD_STARTER_MESSAGE_TYPE
            || (message.type !== undefined && (typeof message.type !== "number" || !Number.isInteger(message.type) || message.type < 0)))
            return false;
        if (context.scope === "dm") {
            const roleIds = readIds(context.ownRoleIds);
            return options.suppressDirectMessages && context.guildId === undefined && message.guild_id == null
                && !context.suppressEveryone && !context.suppressRoles && roleIds !== undefined && roleIds.length === 0
                && (message.type === 0 || message.type === REPLY_MESSAGE_TYPE)
                && isUserMention(message.author) && message.author.id !== context.accountId;
        }
        if (context.scope !== "guild" || !isSnowflake(context.guildId)
            || (message.guild_id !== undefined && message.guild_id !== context.guildId)
            || typeof message.mention_everyone !== "boolean") return false;
        const mentions = readPersonalMentions(message.mentions);
        const roles = readIds(message.mention_roles);
        if (!mentions || !roles) return false;
        let roleApplies = false;
        if (roles.length > 0) {
            const ownRoleIds = readIds(context.ownRoleIds);
            if (!ownRoleIds) return false;
            const membership = new Set(ownRoleIds);
            roleApplies = roles.some(roleId => membership.has(roleId));
        }
        let personalApplies = mentions.includes(context.accountId);
        let replyApplies = false;
        if (message.type === REPLY_MESSAGE_TYPE) {
            const target = readReplyTarget(message, context);
            if (target === "invalid") return false;
            if (personalApplies && target === "unknown" && options.suppressPersonal !== options.suppressReplies) return false;
            if (personalApplies && target === "self") {
                // A known reply to this account is one contextual category, including explicit tags in that reply.
                personalApplies = false;
                replyApplies = true;
            }
        }
        const everyoneApplies = message.mention_everyone;
        const blocked = (everyoneApplies && options.suppressEveryone)
            || (personalApplies && options.suppressPersonal)
            || (replyApplies && options.suppressReplies)
            || (roleApplies && options.suppressRoles);
        // A category already suppressed by Discord cannot rescue another blocked category.
        const permitted = (everyoneApplies && !options.suppressEveryone && !context.suppressEveryone)
            || (personalApplies && !options.suppressPersonal)
            || (replyApplies && !options.suppressReplies)
            || (roleApplies && !options.suppressRoles && !context.suppressRoles);
        return blocked && !permitted;
    } catch {
        // Unknown native data must retain Discord's own decision, without altering that data.
        return false;
    }
}
