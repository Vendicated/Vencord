import { Channel, CustomEmoji, Emoji, FluxStore } from "..";

export class EmojiStore extends FluxStore {
    getCustomEmojiById(id?: string | null): CustomEmoji;
    getUsableCustomEmojiById(id?: string | null): CustomEmoji;
    getGuilds(): Record<string, {
        id: string;
        _emojiMap: Record<string, CustomEmoji>;
        _emojis: CustomEmoji[];
        get emojis(): CustomEmoji[];
        get rawEmojis(): CustomEmoji[];
        _usableEmojis: CustomEmoji[];
        get usableEmojis(): CustomEmoji[];
        _emoticons: any[];
        get emoticons(): any[];
    }>;
    getGuildEmoji(guildId?: string | null): CustomEmoji[];
    getNewlyAddedEmoji(guildId?: string | null): CustomEmoji[];
    getTopEmoji(guildId?: string | null): CustomEmoji[];
    getTopEmojisMetadata(guildId?: string | null): {
        emojiIds: string[];
        topEmojisTTL: number;
    };
    hasPendingUsage(): boolean;
    hasUsableEmojiInAnyGuild(): boolean;
    searchWithoutFetchingLatest(data: any): any;
    getSearchResultsOrder(...args: any[]): any;
    getState(): {
        pendingUsages: { key: string, timestamp: number; }[];
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
        backfillTopEmojis: Record<any, any>;
        customEmojis: Record<string, CustomEmoji>;
        emojisById: Record<string, CustomEmoji>;
        emojisByName: Record<string, CustomEmoji>;
        emoticonRegex: RegExp | null;
        emoticonsByName: Record<string, any>;
        escapedEmoticonNames: string;
        favoriteNamesAndIds?: any;
        favorites?: any;
        frequentlyUsed?: any;
        groupedCustomEmojis: Record<string, CustomEmoji[]>;
        guildId?: string;
        isFavoriteEmojiWithoutFetchingLatest(e: Emoji): boolean;
        newlyAddedEmoji: Record<string, CustomEmoji[]>;
        topEmojis?: any;
        unicodeAliases: Record<string, string>;
        get favoriteEmojisWithoutFetchingLatest(): Emoji[];
    };
}
