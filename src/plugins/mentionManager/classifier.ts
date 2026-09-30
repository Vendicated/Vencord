/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type MentionType =
    | "direct"
    | "replyToMe"
    | "everyone"
    | "here"
    | "role"
    | "otherUser"
    | "none";

/**
 * Minimal structural view shared by the cached `Message` model and the
 * smaller Flux event payload. Both shapes are accepted so callers never
 * need to convert before classifying.
 */
export interface ClassifiableMessage {
    mentions?: string[] | { id: string; }[];
    mentionEveryone?: boolean;
    mention_everyone?: boolean;
    mentionRoles?: string[];
    mention_roles?: string[];
    messageReference?: { message_id?: string; } | undefined;
    message_reference?: { message_id?: string; } | undefined;
    referenced_message?: { author?: { id?: string; }; } | undefined;
    author?: { id?: string; };
    content?: string;
    channel_id?: string;
}

function getMentionIds(msg: ClassifiableMessage): string[] {
    const raw = msg.mentions;
    if (!raw) return [];
    return raw.map(m => typeof m === "string" ? m : m.id);
}

function getMentionRoles(msg: ClassifiableMessage): string[] {
    return msg.mentionRoles ?? msg.mention_roles ?? [];
}

function hasEveryoneFlag(msg: ClassifiableMessage): boolean {
    return msg.mentionEveryone ?? msg.mention_everyone ?? false;
}

/**
 * Classify how a message relates to the current user.
 *
 * Uses structured Discord fields only — never username matching.
 * Priority: direct > replyToMe > everyone/here > role > otherUser > none.
 *
 * NOTE: Discord exposes a single `mention_everyone` flag for both
 * `@everyone` and `@here`; there is no reliable structured way to tell
 * them apart. `here` is returned only as a best-effort guess from the raw
 * content, and callers must treat `everyone` and `here` identically
 * (see `isBroadcast`).
 *
 * @param msg message (cached model or Flux payload)
 * @param currentUserId id from `UserStore.getCurrentUser().id` — never hardcoded
 * @param referencedAuthorId author id of the referenced message, resolved
 *        by the caller via MessageStore when available
 */
export function classifyMention(
    msg: ClassifiableMessage,
    currentUserId: string,
    referencedAuthorId?: string
): MentionType {
    if (!msg || msg.author?.id === currentUserId) return "none";

    const mentionIds = getMentionIds(msg);
    if (mentionIds.includes(currentUserId)) return "direct";

    const replyAuthor = referencedAuthorId ?? msg.referenced_message?.author?.id;
    if (replyAuthor === currentUserId) return "replyToMe";

    if (hasEveryoneFlag(msg)) {
        const content = msg.content ?? "";
        if (content.includes("@here") && !content.includes("@everyone")) return "here";
        return "everyone";
    }

    if (getMentionRoles(msg).length > 0) return "role";

    if (mentionIds.length > 0) return "otherUser";

    return "none";
}

/** True for broadcast mentions (@everyone/@here), always handled together. */
export function isBroadcast(type: MentionType): boolean {
    return type === "everyone" || type === "here";
}

/**
 * True for mentions worth keeping in the history index.
 * Broadcasts are indexed so the user can review what Smart Read acked.
 */
export function isIndexableMention(type: MentionType): boolean {
    return type === "direct" || type === "replyToMe" || isBroadcast(type);
}
