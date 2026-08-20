/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Channel } from "@vencord/discord-types";
import { RestAPI } from "@webpack/common";

export interface RawUser {
    id: string;
    username: string;
    global_name?: string | null;
    avatar: string | null;
    discriminator: string;
    bot?: boolean;
}

export interface RawAttachment {
    id: string;
    filename: string;
    content_type?: string;
    size: number;
    url: string;
    proxy_url: string;
    width?: number;
    height?: number;
    spoiler?: boolean;
}

export interface RawEmbedMedia {
    url: string;
    proxy_url?: string;
    width?: number;
    height?: number;
}

export interface RawEmbed {
    type?: string;
    url?: string;
    title?: string;
    description?: string;
    thumbnail?: RawEmbedMedia;
    image?: RawEmbedMedia;
    video?: RawEmbedMedia;
    provider?: { name?: string; url?: string; };
    author?: { name?: string; url?: string; };
}

export interface RawMessage {
    id: string;
    channel_id: string;
    content: string;
    timestamp: string;
    author: RawUser;
    attachments: RawAttachment[];
    embeds: RawEmbed[];
    /** Only present on search results: marks the message that actually matched the query inside its context group. */
    hit?: boolean;
}

export interface PinEntry {
    message: RawMessage;
    pinnedAt: string | null;
}

export type SearchHasFilter = "image" | "video" | "file" | "link";

export interface SearchPage {
    messages: RawMessage[];
    totalResults: number;
    /** Discord is still building the search index for this channel/guild (common for large channels the first time they're searched). */
    indexing: boolean;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|avif|heic|heif|tiff?)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|mkv|m4v|avi)$/i;

export function isImageAttachment(a: RawAttachment) {
    return a.content_type?.startsWith("image/") || IMAGE_EXT.test(a.filename);
}

export function isVideoAttachment(a: RawAttachment) {
    return a.content_type?.startsWith("video/") || VIDEO_EXT.test(a.filename);
}

export function formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes)) return "";

    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${unitIndex === 0 ? size : size.toFixed(2)} ${units[unitIndex]}`;
}

const DEFAULT_AVATAR_COUNT = 6;

export function getAuthorAvatarUrl(author: RawUser, size = 80): string {
    if (author.avatar) {
        const ext = author.avatar.startsWith("a_") ? "gif" : "png";
        return `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.${ext}?size=${size}`;
    }

    const index = author.discriminator && author.discriminator !== "0"
        ? Number(author.discriminator) % 5
        : Number((BigInt(author.id) >> 22n) % BigInt(DEFAULT_AVATAR_COUNT));

    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export function getMessageJumpPath(channel: Channel, messageId: string): string {
    const guildPart = channel.guild_id || "@me";
    return `/channels/${guildPart}/${channel.id}/${messageId}`;
}

/**
 * Fetches the pinned messages for a channel.
 *
 * Discord has shipped two response shapes for this endpoint over time:
 * - legacy: a bare array of Message objects
 * - current: `{ items: { pinned_timestamp, message }[], has_more }`
 * We normalize both into a single shape.
 */
export async function fetchPins(channel: Channel): Promise<PinEntry[]> {
    const { body } = await RestAPI.get({ url: `/channels/${channel.id}/pins` });

    if (Array.isArray(body)) {
        return (body as RawMessage[]).map(message => ({ message, pinnedAt: null }));
    }

    const items: any[] = body?.items ?? [];
    return items.map(item => ({
        message: (item.message ?? item) as RawMessage,
        pinnedAt: item.pinned_timestamp ?? item.pinned_at ?? null,
    }));
}

/**
 * Searches a channel's message history using Discord's own search backend (the same one
 * powering Ctrl+F and the mobile app's Media/Files/Links tabs), scoped with a `has:` filter.
 */
export async function searchChannel(channel: Channel, has: SearchHasFilter[], offset: number): Promise<SearchPage> {
    const isGuildChannel = !!channel.guild_id;
    const url = isGuildChannel
        ? `/guilds/${channel.guild_id}/messages/search`
        : `/channels/${channel.id}/messages/search`;

    const query: Record<string, any> = { offset };
    if (isGuildChannel) query.channel_id = channel.id;
    if (has.length) query.has = has;

    let body: any;
    try {
        ({ body } = await RestAPI.get({ url, query }));
    } catch (e: any) {
        // Discord answers with a 202 + retry_after while it is still indexing search results
        // for a channel/guild that has never been searched before.
        body = e?.body;
        if (body?.retry_after == null) throw e;
    }

    if (body?.retry_after != null && !Array.isArray(body?.messages)) {
        return { messages: [], totalResults: 0, indexing: true };
    }

    const groups: RawMessage[][] = body?.messages ?? [];
    const messages = groups
        .map(group => group.find(m => m.hit) ?? group[group.length - 1])
        .filter((m): m is RawMessage => m != null);

    return {
        messages,
        totalResults: body?.total_results ?? messages.length,
        indexing: false,
    };
}
