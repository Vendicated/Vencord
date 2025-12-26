import { Channel, CustomEmoji, Emoji, FluxStore } from "..";

export interface EmojiCategory {
    id: string;
    name: string;
    emojis: string[];
}

export interface EmojiFrecency {
    totalUses: number;
    frecencyByEmoji: Record<string, { totalUses: number; recentUses: number[]; score: number; }>;
}

export class EmojiStore extends FluxStore {
    get categories(): Record<string, EmojiCategory>;
    get diversitySurrogate(): string;
    get emojiFrecencyWithoutFetchingLatest(): EmojiFrecency;
    get emojiReactionFrecencyWithoutFetchingLatest(): EmojiFrecency;
    get expandedSectionsByGuildIds(): Record<string, boolean>;
    get loadState(): number;

    getCustomEmojiById(id?: string | null): CustomEmoji | undefined;
    getUsableCustomEmojiById(id?: string | null): CustomEmoji | undefined;
    getGuilds(): Record<string, {
        id: string;
        get emojis(): CustomEmoji[];
        get rawEmojis(): CustomEmoji[];
        get usableEmojis(): CustomEmoji[];
        get emoticons(): unknown[];
        getEmoji(id: string): CustomEmoji | undefined;
        isUsable(emoji: CustomEmoji): boolean;
    }>;
    getGuildEmoji(guildId?: string | null): CustomEmoji[];
    getUsableGuildEmoji(guildId?: string | null): CustomEmoji[];
    getNewlyAddedEmoji(guildId?: string | null): CustomEmoji[];
    getTopEmoji(guildId?: string | null): CustomEmoji[];
    getTopEmojisMetadata(guildId?: string | null): {
        emojiIds: string[];
        topEmojisTTL: number;
    } | undefined;
    hasFavoriteEmojis(guildId?: string | null): boolean;
    hasPendingUsage(): boolean;
    hasUsableEmojiInAnyGuild(): boolean;
    getSearchResultsOrder(...args: unknown[]): unknown;
    getState(): {
        pendingUsages: { key: string; timestamp: number; }[];
    };
    searchWithoutFetchingLatest(data: {
        channel: Channel;
        query: string;
        count?: number;
        intention: number;
        includeExternalGuilds?: boolean;
        matchComparator?(name: string): boolean;
    }): Record<"locked" | "unlocked", Emoji[]>;

    getDisambiguatedEmojiContext(): {
        backfillTopEmojis: Record<string, unknown>;
        customEmojis: Record<string, CustomEmoji>;
        emojisById: Record<string, CustomEmoji>;
        emojisByName: Record<string, CustomEmoji>;
        emoticonRegex: RegExp | null;
        emoticonsByName: Record<string, unknown>;
        escapedEmoticonNames: string;
        favoriteNamesAndIds?: unknown;
        favorites?: unknown;
        frequentlyUsed?: unknown;
        groupedCustomEmojis: Record<string, CustomEmoji[]>;
        guildId?: string;
        isFavoriteEmojiWithoutFetchingLatest(e: Emoji): boolean;
        newlyAddedEmoji: Record<string, CustomEmoji[]>;
        topEmojis?: unknown;
        unicodeAliases: Record<string, string>;
        get favoriteEmojisWithoutFetchingLatest(): Emoji[];
    };
}
