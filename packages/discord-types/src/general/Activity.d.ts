/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** @todo Might have more properties. */
export interface Activity {
    application_id?: string | number;
    assets?: ActivityAssets;
    buttons?: string[];
    created_at: number;
    details?: string;
    emoji?: ActivityEmoji;
    flags?: ActivityFlags;
    id: string;
    name: string;
    party?: ActivityParty;
    platform?: ActivityGamePlatform;
    session_id?: string;
    state?: string;
    supported_platforms?: ActivityPlatform[];
    sync_id?: string;
    timestamps?: ActivityTimestamps;
    type: ActivityType;
    url?: string;
}

export interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

export type ActivityEmoji = ActivityCustomEmoji | ActivityUnicodeEmoji;

export interface ActivityCustomEmoji {
    animated: boolean;
    id: string;
    name: string;
}

export interface ActivityUnicodeEmoji {
    name: string;
}

export const enum ActivityFlags {
    INSTANCE = 1 << 0,
    JOIN = 1 << 1,
    SYNC = 1 << 4,
    PLAY = 1 << 5,
    PARTY_PRIVACY_FRIENDS = 1 << 6,
    PARTY_PRIVACY_VOICE_CHANNEL = 1 << 7,
    EMBEDDED = 1 << 8,
}

export interface ActivityParty {
    id?: string;
    size?: [minimumSize: number, maximumSize: number];
}

// Original name: ActivityGamePlatforms
export const enum ActivityGamePlatform {
    ANDROID = "android",
    DESKTOP = "desktop",
    EMBEDDED = "embedded",
    IOS = "ios",
    PS4 = "ps4",
    PS5 = "ps5",
    SAMSUNG = "samsung",
    XBOX = "xbox",
}

export const enum ActivityPlatform {
    DESKTOP = "desktop",
    MOBILE = "mobile",
}

export interface ActivityTimestamps {
    end?: number;
    start?: number;
}

// Original name: ActivityTypes
export const enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    CUSTOM_STATUS = 4,
    COMPETING = 5,
    HANG_STATUS = 6,
}
