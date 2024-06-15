/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { ChannelRecord } from "../general/channels/ChannelRecord";
import type { Emoji, GuildEmoji } from "../general/emojis/Emoji";
import type { EmojiDisambiguations } from "../general/emojis/EmojiDisambiguations";
import type { GuildEmojis } from "../general/emojis/GuildEmojis";
import type { Frecency } from "../general/Frecency";
import type { GenericConstructor, Nullish } from "../internal";
import type { FluxPersistedStore } from "./abstract/FluxPersistedStore";

export interface EmojiStoreState {
    pendingUsages: {
        key: string;
        timestamp: number;
    }[];
}

export type EmojiStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC" | "CACHED_EMOJIS_LOADED" | "CONNECTION_OPEN" | "EMOJI_AUTOSUGGESTION_UPDATE" | "EMOJI_TRACK_USAGE" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_EMOJIS_UPDATE" | "GUILD_MEMBER_UPDATE" | "GUILD_ROLE_CREATE" | "GUILD_ROLE_UPDATE" | "GUILD_UPDATE" | "MESSAGE_REACTION_ADD" | "TOP_EMOJIS_FETCH_SUCCESS" | "USER_SETTINGS_PROTO_UPDATE">;

export declare class EmojiStore<
    Constructor extends GenericConstructor = typeof EmojiStore,
    State extends EmojiStoreState = EmojiStoreState,
    Action extends FluxAction = EmojiStoreAction
> extends FluxPersistedStore<Constructor, State, Action> {
    static displayName: "EmojiStore";
    static persistKey: "EmojiStoreV2";

    get categories(): string[];
    get diversitySurrogate(): string;
    get emojiFrecencyWithoutFetchingLatest(): Frecency<string, Emoji>;
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
    initialize(state: State): void;
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
}
