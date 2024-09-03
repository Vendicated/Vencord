/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PersistedStore } from "../flux/PersistedStore";
import type { ChannelRecord } from "../general/channels/ChannelRecord";
import type { Emoji, GuildEmoji } from "../general/emojis/Emoji";
import type { EmojiDisambiguations } from "../general/emojis/EmojiDisambiguations";
import type { GuildEmojis } from "../general/emojis/GuildEmojis";
import type { Frecency } from "../general/Frecency";
import type { GenericConstructor, Nullish } from "../internal";

export interface EmojiStoreState {
    emojiReactionPendingUsages: EmojiUsage[];
    expandedSectionsByGuildIds: Set<string>;
    pendingUsages: EmojiUsage[];
}

export interface EmojiUsage {
    key: string;
    timestamp: number;
}

export declare class EmojiStore<
    Constructor extends GenericConstructor = typeof EmojiStore,
    State extends EmojiStoreState = EmojiStoreState
> extends PersistedStore<Constructor, State> {
    static displayName: "EmojiStore";
    static persistKey: "EmojiStoreV2";

    get categories(): string[];
    get diversitySurrogate(): string;
    get emojiFrecencyWithoutFetchingLatest(): Frecency<string, Emoji>;
    get emojiReactionFrecencyWithoutFetchingLatest(): Frecency<string, Emoji>;
    get expandedSectionsByGuildIds(): EmojiStoreState["expandedSectionsByGuildIds"];
    getCustomEmojiById(emojiId: string): GuildEmoji | undefined;
    getDisambiguatedEmojiContext(guildId?: string | Nullish): EmojiDisambiguations;
    getEmojiAutosuggestion(channel?: ChannelRecord): Emoji[];
    getGuildEmoji(guildId: string): GuildEmoji[];
    getGuilds(): { [guildId: string]: GuildEmojis; };
    getNewlyAddedEmoji(guildId?: string | Nullish): GuildEmoji[];
    /** If count is less than or equal to 0, all results will be returned. */
    getSearchResultsOrder(emojis: Emoji[], query: string, count: number): Emoji[];
    getState(): State;
    getTopEmoji(guildId?: string | Nullish): GuildEmoji[];
    getTopEmojisMetadata(guildId: string): GuildTopEmojisMetadata | undefined;
    getUsableCustomEmojiById(emojiId: string): GuildEmoji | undefined;
    getUsableGuildEmoji(guildId: string): GuildEmoji[];
    hasFavoriteEmojis(guildId?: string | Nullish): boolean;
    hasPendingUsage(): boolean;
    hasUsableEmojiInAnyGuild(): boolean;
    initialize(state?: State | Nullish): void;
    get loadState(): number;
    /** If count is less than or equal to 0, all unlocked results will be returned. */
    searchWithoutFetchingLatest(options: {
        channel?: ChannelRecord | Nullish;
        count?: number | undefined /* = 0 */;
        includeExternalGuilds?: boolean | undefined /* = true */;
        intention: EmojiIntention;
        matchComparator?: ((value: string, index: number, array: string[]) => unknown) | Nullish;
        query: string;
    }): {
        locked: GuildEmoji[];
        unlocked: Emoji[];
    };
}

export interface GuildTopEmojisMetadata {
    emojiIds: string[];
    topEmojisTTL: number;
}

export enum EmojiIntention {
    REACTION = 0,
    STATUS = 1,
    COMMUNITY_CONTENT = 2,
    CHAT = 3,
    GUILD_STICKER_RELATED_EMOJI = 4,
    GUILD_ROLE_BENEFIT_EMOJI = 5,
    SOUNDBOARD = 6,
    VOICE_CHANNEL_TOPIC = 7,
    GIFT = 8,
    AUTO_SUGGESTION = 9,
    POLLS = 10,
    PROFILE = 11,
}
