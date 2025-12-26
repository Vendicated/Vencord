import { Channel, CustomEmoji, Emoji, FluxStore } from "..";

export interface EmojiUsageRecord {
    totalUses: number;
    recentUses: number[];
    frecency: number;
    score: number;
}

export interface EmojiFrecency {
    /** true when data modified and needs recomputation */
    dirty: boolean;
    _frequently: Emoji[];
    numFrequentlyItems: number;
    maxSamples: number;
    computeBonus: () => number;
    computeWeight: (index: number) => number;
    computeFrecency: (totalUses: number, score: number, config: { numOfRecentUses?: number; maxTotalUse?: number; }) => number;
    calculateMaxTotalUse: boolean;
    lookupKey: (name: string) => Emoji | undefined;
    /** keyed by emoji name or id */
    usageHistory: Record<string, EmojiUsageRecord>;
    afterCompute: () => void;
}

export interface GuildEmojis {
    id: string;
    get emojis(): CustomEmoji[];
    get usableEmojis(): CustomEmoji[];
    get emoticons(): unknown[];
    getEmoji(id: string): CustomEmoji | undefined;
    getUsableEmoji(id: string): CustomEmoji | undefined;
    isUsable(emoji: CustomEmoji): boolean;
    emojiIds(): string[];
}

export interface EmojiStoreState {
    pendingUsages: { key: string; timestamp: number; }[];
    emojiReactionPendingUsages: { key: string; timestamp: number; }[];
    expandedSectionsByGuildIds: string[];
}

export interface DisambiguatedEmojiContext {
    favorites: unknown[] | null;
    favoriteNamesAndIds: unknown[] | null;
    topEmojis: unknown[] | null;
    guildId: string | null;
    escapedEmoticonNames: string;
    disambiguatedEmoji: Emoji[];
    emoticonRegex: RegExp | null;
    frequentlyUsed: Emoji[] | null;
    frequentlyUsedReactionEmojis: Emoji[] | null;
    frequentlyUsedReactionNamesAndIds: unknown[] | null;
    unicodeAliases: Record<string, string>;
    customEmojis: Record<string, CustomEmoji>;
    groupedCustomEmojis: Record<string, CustomEmoji[]>;
    newlyAddedEmoji: Record<string, CustomEmoji[]>;
    get favoriteEmojisWithoutFetchingLatest(): Emoji[];
    isFavoriteEmojiWithoutFetchingLatest(emoji: Emoji): boolean;
}

export class EmojiStore extends FluxStore {
    get categories(): string[];
    /** skin tone modifier for emoji diversity (e.g. 🏻🏼🏽🏾🏿) */
    get diversitySurrogate(): string;
    get emojiFrecencyWithoutFetchingLatest(): EmojiFrecency;
    get emojiReactionFrecencyWithoutFetchingLatest(): EmojiFrecency;
    get expandedSectionsByGuildIds(): string[];
    get loadState(): number;

    getCustomEmojiById(id?: string | null): CustomEmoji | undefined;
    getUsableCustomEmojiById(id?: string | null): CustomEmoji | undefined;
    getGuilds(): Record<string, GuildEmojis>;
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
    getState(): EmojiStoreState;
    searchWithoutFetchingLatest(data: {
        channel: Channel;
        query: string;
        count?: number;
        intention: number;
        includeExternalGuilds?: boolean;
        matchComparator?(name: string): boolean;
    }): Record<"locked" | "unlocked", Emoji[]>;
    getDisambiguatedEmojiContext(): DisambiguatedEmojiContext;
}
