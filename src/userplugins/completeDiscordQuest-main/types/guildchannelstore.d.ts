/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

interface GuildData {
    "4": _4[];
    id: string;
    SELECTABLE: SELECTABLE[];
    VOCAL: VOCAL[];
    count: number;
}

interface VOCAL {
    channel: Channel3;
    comparator: number;
}

interface Channel3 {
    bitrate_: number;
    flags_: number;
    guild_id: string;
    iconEmoji: IconEmoji;
    id: string;
    lastMessageId: string;
    name: string;
    nsfw_: boolean;
    parent_id: string;
    permissionOverwrites_: PermissionOverwrites3;
    position_: number;
    rateLimitPerUser_: number;
    rtcRegion: null;
    type: number;
    userLimit_: number;
}

interface PermissionOverwrites3 {
    [key: string]: Permission;
}

interface SELECTABLE {
    channel: Channel2;
    comparator: number;
}

interface Channel2 {
    flags_: number;
    guild_id: string;
    iconEmoji?: IconEmoji;
    id: string;
    lastMessageId: string;
    name: string;
    nsfw_: boolean;
    parent_id: string;
    permissionOverwrites_: PermissionOverwrites2;
    position_: number;
    rateLimitPerUser_: number;
    topic_: null | string;
    type: number;
    availableTags?: AvailableTag[];
    defaultThreadRateLimitPerUser?: number;
    template?: string;
    defaultAutoArchiveDuration?: number;
    defaultReactionEmoji?: DefaultReactionEmoji;
    lastPinTimestamp?: string;
    themeColor?: null;
}

interface DefaultReactionEmoji {
    emojiId: null;
    emojiName: string;
}

interface AvailableTag {
    id: string;
    name: string;
    emojiId: null | string;
    emojiName: null | string;
    moderated: boolean;
    color: null;
}

interface PermissionOverwrites2 {
    [key: string]: Permission;
}

interface IconEmoji {
    id: null;
    name: string;
}

interface _4 {
    comparator: number;
    channel: Channel;
}

interface Channel {
    id: string;
    type: number;
    name: string;
    guild_id: null | string;
    permissionOverwrites_: PermissionOverwrites;
    flags_?: number;
    nsfw_?: boolean;
    position_?: number;
    rateLimitPerUser_?: number;
}

interface PermissionOverwrites {
    [key: string]: Permission;
}

interface Permission {
    id: string;
    type: number;
    allow: string;
    deny: string;
}
