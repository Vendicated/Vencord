/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CollectionChain } from "lodash";

import type { Defined, Nullish } from "../../internal";
import type { Emoji, EmojiType, GuildEmoji, UnicodeEmoji } from "./Emoji";

export declare class EmojiDisambiguations {
    constructor(guildId: string | null);

    static _lastInstance: EmojiDisambiguations | null;
    static clear(guildId: string): void;
    static get(guildId?: string | Nullish): EmojiDisambiguations;
    static reset(): void;
    static resetFavorites(): void;
    static resetFrequentlyUsed(): void;

    _buildDisambiguatedCustomEmoji(): void;
    ensureDisambiguated(): void;
    get favoriteEmojisWithoutFetchingLatest(): Emoji[];
    getById(emojiId: string): GuildEmoji | undefined;
    getByName<Type extends EmojiType>(emojiName: string):
        (Type extends EmojiType.GUILD ? GuildEmoji : UnicodeEmoji) | undefined;
    getCustomEmoji(): Defined<this["customEmojis"]>;
    getCustomEmoticonRegex(): RegExp | null;
    getDisambiguatedEmoji(): Emoji[];
    getEmojiInPriorityOrderWithoutFetchingLatest(): Emoji[];
    getEmoticonByName(emoticonName: string): GuildEmoji | undefined;
    getEscapedCustomEmoticonNames(): string;
    getFrequentlyUsedEmojisWithoutFetchingLatest(): Emoji[];
    getGroupedCustomEmoji(): Defined<this["groupedCustomEmojis"]>;
    getNewlyAddedEmojiForGuild(guildId: string): GuildEmoji[];
    getTopEmojiWithoutFetchingLatest(guildId: string): GuildEmoji[];
    nameMatchesChain(predicate: (value: string, index: number, array: string[]) => unknown): CollectionChain<string>;
    rebuildFavoriteEmojisWithoutFetchingLatest(): {
        favoriteNamesAndIds: Set<string>;
        favorites: Emoji[];
    };

    customEmojis: { [emojiName: string]: GuildEmoji; } | undefined;
    disambiguatedEmoji: Emoji[] | null;
    emojisById: { [emojiId: string]: GuildEmoji; } | undefined;
    emojisByName: { [emojiName: string]: Emoji; } | undefined;
    emoticonRegex: RegExp | null;
    emoticonsByName: { [emoticonName: string]: GuildEmoji; } | undefined;
    escapedEmoticonNames: string | null;
    favoriteNamesAndIds: Set<string> | null;
    favorites: Emoji[] | null;
    frequentlyUsed: Emoji[] | null;
    groupedCustomEmojis: { [guildId: string]: GuildEmoji; } | undefined;
    guildId: string | null;
    isFavoriteEmojiWithoutFetchingLatest: (emoji?: Emoji | Nullish) => boolean;
    newlyAddedEmoji: { [guildId: string]: GuildEmoji; } | null;
    topEmojis: GuildEmoji[] | null;
    unicodeAliases: Record<string, string> | undefined;
}
