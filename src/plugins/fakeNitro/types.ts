/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const enum EmojiIntentions {
    REACTION,
    STATUS,
    COMMUNITY_CONTENT,
    CHAT,
    GUILD_STICKER_RELATED_EMOJI,
    GUILD_ROLE_BENEFIT_EMOJI,
    COMMUNITY_CONTENT_ONLY,
    SOUNDBOARD,
    VOICE_CHANNEL_TOPIC,
    GIFT,
    AUTO_SUGGESTION,
    POLLS
}

export const enum StickerType {
    PNG = 1,
    APNG = 2,
    LOTTIE = 3,
    // don't think you can even have gif stickers but the docs have it
    GIF = 4
}

export interface BaseSticker {
    available: boolean;
    description: string;
    format_type: number;
    id: string;
    name: string;
    tags: string;
    type: number;
}
export interface GuildSticker extends BaseSticker {
    guild_id: string;
}
export interface DiscordSticker extends BaseSticker {
    pack_id: string;
}
export type Sticker = GuildSticker | DiscordSticker;

export interface StickerPack {
    id: string;
    name: string;
    sku_id: string;
    description: string;
    cover_sticker_id: string;
    banner_asset_id: string;
    stickers: Sticker[];
}

export const enum FakeNoticeType {
    Sticker,
    Emoji
}
