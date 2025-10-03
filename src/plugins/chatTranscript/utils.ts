/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelStore, GuildStore, UserStore } from "@webpack/common";
import { Channel, Message } from "@vencord/discord-types";

import { RELATIVE_DATE_PATTERN, RELATIVE_UNITS, TEXT_BASED_CHANNEL_TYPES } from "./constants";

function isTextBasedChannel(channel?: Channel | null): channel is Channel {
    return !!channel && TEXT_BASED_CHANNEL_TYPES.has(channel.type as number);
}

function safeGetChannel(channelId?: string | null): Channel | undefined {
    if (!channelId) return undefined;
    try {
        return ChannelStore.getChannel(channelId) as Channel;
    } catch {
        return undefined;
    }
}

function safeGetUser(userId?: string | null) {
    if (!userId) return undefined;
    try {
        return UserStore.getUser(userId);
    } catch {
        return undefined;
    }
}

function getChannelDisplayName(channel?: Channel): string {
    if (!channel) return "Unknown Channel";
    const type = channel.type as number;

    if (type === 1) {
        const user = safeGetUser(channel.recipients?.[0]);
        const name = user?.globalName ?? user?.username ?? channel.name ?? "Direct Message";
        const suffix = user?.discriminator && user.discriminator !== "0" ? `#${user.discriminator}` : "";
        return `Direct Message - ${name}${suffix}`;
    }

    if (type === 3) {
        const explicitName = channel.name;
        const participants = channel.recipients?.map(id => safeGetUser(id)?.username ?? "Unknown").join(", ");
        return `Group DM - ${explicitName ?? participants ?? channel.id}`;
    }

    const guildName = channel.guild_id ? GuildStore.getGuild(channel.guild_id)?.name ?? "Unknown Guild" : "DM";
    const channelName = channel.name ?? channel.id;
    return `${guildName} - #${channelName}`;
}

function sanitizeFilename(value: string): string {
    return value.replace(/[\\/:*?"<>|]/g, "_");
}

function formatFileSize(bytes?: number): string {
    if (bytes == null || bytes < 0) return "";
    const units = ["B", "KiB", "MiB", "GiB", "TiB"];
    let size = bytes;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index++;
    }
    const precision = index === 0 ? 0 : 2;
    return `${size.toFixed(precision)} ${units[index]}`;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
    return escapeHtml(value).replace(/`/g, "&#96;");
}

function messageHasMedia(message: Message): boolean {
    return Boolean(message.attachments?.length || message.embeds?.length || message.sticker_items?.length);
}

function messageMatchesKeyword(message: Message, keyword: string, includeAttachments: boolean, includeEmbeds: boolean): boolean {
    if (!keyword) return true;
    const lower = keyword.toLowerCase();

    if (message.content?.toLowerCase().includes(lower)) return true;

    if (includeAttachments && message.attachments) {
        for (const attachment of message.attachments) {
            if (
                attachment.filename?.toLowerCase().includes(lower) ||
                attachment.url?.toLowerCase().includes(lower)
            ) {
                return true;
            }
        }
    }

    if (includeEmbeds && message.embeds) {
        for (const embed of message.embeds) {
            if (
                embed.title?.toLowerCase().includes(lower) ||
                embed.description?.toLowerCase().includes(lower) ||
                embed.footer?.text?.toLowerCase().includes(lower) ||
                embed.author?.name?.toLowerCase().includes(lower)
            ) {
                return true;
            }
        }
    }

    return false;
}

function parseDateInput(raw: string): number | null {
    const value = raw.trim();
    if (!value.length) return null;
    if (value.toLowerCase() === "now") return Date.now();

    const relative = value.match(RELATIVE_DATE_PATTERN);
    if (relative) {
        const [, sign, amountRaw, unitRaw] = relative;
        const unit = RELATIVE_UNITS[unitRaw.toLowerCase()];
        if (unit) {
            const amount = parseInt(amountRaw, 10);
            if (!Number.isNaN(amount)) {
                const offset = amount * unit * (sign === "-" ? -1 : 1);
                return Date.now() + offset;
            }
        }
    }

    const absolute = Date.parse(value);
    return Number.isNaN(absolute) ? null : absolute;
}

function extractAuthorIds(raw: string): Set<string> | null {
    const tokens = raw
        .split(/[\s,]+/)
        .map(t => t.trim())
        .filter(Boolean);

    if (!tokens.length) return null;

    const ids = new Set<string>();
    const users = UserStore.getUsers?.();

    for (const token of tokens) {
        const mentionMatch = token.match(/^<@!?(\d{16,22})>$/);
        if (mentionMatch) {
            ids.add(mentionMatch[1]);
            continue;
        }

        if (/^\d{16,22}$/.test(token)) {
            ids.add(token);
            continue;
        }

        if (token.includes("#")) {
            const [username, discrim] = token.split("#");
            if (username && discrim) {
                try {
                    const user = UserStore.findByTag(username, discrim);
                    if (user) {
                        ids.add(user.id);
                        continue;
                    }
                } catch {
                    // ignore missing user
                }
            }
        }

        if (users) {
            const lower = token.toLowerCase();
            for (const user of Object.values(users)) {
                if (user.username?.toLowerCase() === lower || user.globalName?.toLowerCase() === lower) {
                    ids.add(user.id);
                    break;
                }
            }
        }
    }

    return ids.size ? ids : null;
}

function getMessageDisplayName(message: Message): string {
    return (
        message.member?.nick ??
        message.author?.global_name ??
        message.author?.username ??
        message.author?.id ??
        "Unknown User"
    );
}

function buildAvatarUrl(message: Message, size = 64): string {
    const user = message.author;
    if (!user) return "";
    const base = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}`
        : `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator ?? 0) % 5}.png`;
    return `${base}?size=${size}`;
}

export {
    buildAvatarUrl,
    escapeAttribute,
    escapeHtml,
    extractAuthorIds,
    formatFileSize,
    getChannelDisplayName,
    getMessageDisplayName,
    isTextBasedChannel,
    messageHasMedia,
    messageMatchesKeyword,
    parseDateInput,
    safeGetChannel,
    safeGetUser,
    sanitizeFilename
};

