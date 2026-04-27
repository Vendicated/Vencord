import { Channel, CustomEmoji, Emoji, FluxStore } from "..";
import { EmojiIntention, LoadState } from "../../enums";

/** Emoji picker category names. */
export type EmojiCategory =
    | "top guild emoji"
    | "favorites"
    | "recent"
    | "custom"
    | "people"
    | "nature"
    | "food"
    | "activity"
    | "travel"
    | "objects"
    | "symbols"
    | "flags";

/**
 * Tracks usage statistics for a single emoji to compute frecency scores.
 */
export interface EmojiUsageRecord {
    /** Total number of times this emoji has been used. */
    totalUses: number;
    /** Array of recent usage timestamps in milliseconds. */
    recentUses: number[];
    /** Computed frecency score combining frequency and recency, -1 when dirty. */
    frecency: number;
    /** Raw score before frecency computation. */
    score: number;
}

/**
 * Options for tracking emoji usage.
 */
export interface TrackOptions {
    /** Timestamp of the usage in milliseconds. */
    timestamp?: number;
    /** Number of uses since last track call. */
    usesSinceLastTrack?: number;
}

/**
 * Frecency tracker for emoji usage, combines frequency and recency to rank emojis.
 * Used by both regular emoji picker and reaction emoji picker.
 */
export interface EmojiFrecency {
    /** True when data has been modified and needs recomputation. */
    dirty: boolean;
    /** Cached array of frequently used emojis after computation. */
    _frequently: Emoji[];
    /** Maximum number of frequently used items to track (default 42). */
    numFrequentlyItems: number;
    /** Maximum number of recent usage samples to keep per emoji (default 10). */
    maxSamples: number;
    /** Computes bonus score for frecency calculation (returns 100). */
    computeBonus: () => number;
    /**
     * Computes weight multiplier based on recency index.
     * Returns 100 for index <= 3, 70 for <= 15, 50 for <= 30, 30 for <= 45, 10 for <= 80.
     */
    computeWeight: (index: number) => number;
    /**
     * Computes frecency score for an emoji.
     * @param totalUses Total number of times emoji was used.
     * @param score Raw score value.
     * @param config Configuration for frecency calculation.
     */
    computeFrecency: (totalUses: number, score: number, config: {
        /** Number of recent uses to consider. */
        numOfRecentUses?: number;
        /** Maximum total uses to cap at. */
        maxTotalUse?: number;
    }) => number;
    /** Whether to calculate max total use dynamically. */
    calculateMaxTotalUse: boolean;
    /**
     * Looks up an emoji by name or id.
     * @param name Emoji name or id to look up.
     * @returns The emoji if found.
     */
    lookupKey: (name: string) => Emoji | undefined;
    /** Usage history keyed by emoji name (for unicode) or id (for custom). */
    usageHistory: Record<string, EmojiUsageRecord>;
    /** Callback invoked after frecency computation completes. */
    afterCompute: () => void;

    /**
     * Overwrites the usage history with new data.
     * @param history New usage history to set.
     * @param pendingUsages Pending usages to track after overwriting.
     */
    overwriteHistory(history: Record<string, EmojiUsageRecord> | null, pendingUsages?: PendingUsage[]): void;
    /** Marks the frecency data as dirty, requiring recomputation. */
    markDirty(): void;
    /** Returns whether the frecency data needs recomputation. */
    isDirty(): boolean;
    /**
     * Tracks usage of an emoji.
     * @param key Emoji name or id.
     * @param options Track options including timestamp.
     */
    track(key: string, options?: TrackOptions): void;
    /**
     * Gets the usage record for an emoji, computing if dirty.
     * @param key Emoji name or id.
     * @returns The usage record or null if not found.
     */
    getEntry(key: string): EmojiUsageRecord | null;
    /**
     * Gets the score for an emoji.
     * @param key Emoji name or id.
     * @returns The score or null if not found.
     */
    getScore(key: string): number | null;
    /**
     * Gets the frecency for an emoji.
     * @param key Emoji name or id.
     * @returns The frecency or null if not found.
     */
    getFrecency(key: string): number | null;
    /** Recomputes frecency scores for all emojis. */
    compute(): void;
    /** Gets the frequently used emojis, computing if necessary. */
    get frequently(): Emoji[];
}

/**
 * Container for a guild's emoji collection with usability checks.
 */
export interface GuildEmojis {
    /** Guild id this emoji collection belongs to. */
    id: string;
    /** User id for permission checks. */
    _userId: string;
    /** Internal emoji array. */
    _emojis: CustomEmoji[];
    /** Fast lookup map of emoji id to emoji. */
    _emojiMap: Record<string, CustomEmoji>;
    /** Internal emoticons array. */
    _emoticons: Emoticon[];
    /** Internal usable emojis cache. */
    _usableEmojis: CustomEmoji[];
    /** Whether user can see server subscription IAP. */
    _canSeeServerSubIAP: boolean;
    /** All custom emojis in this guild. */
    get emojis(): CustomEmoji[];
    /** Custom emojis the current user can use in this guild. */
    get usableEmojis(): CustomEmoji[];
    /** Text emoticons configured for this guild. */
    get emoticons(): Emoticon[];
    /**
     * Gets an emoji by id from this guild.
     * @param id Emoji id to look up.
     */
    getEmoji(id: string): CustomEmoji | undefined;
    /**
     * Gets a usable emoji by id from this guild.
     * @param id Emoji id to look up.
     */
    getUsableEmoji(id: string): CustomEmoji | undefined;
    /**
     * Checks if an emoji is usable by the current user.
     * @param emoji Emoji to check.
     */
    isUsable(emoji: CustomEmoji): boolean;
    /** Returns array of all emoji ids in this guild. */
    emojiIds(): string[];
}

/**
 * Text emoticon that can be converted to emoji.
 */
export interface Emoticon {
    /** Names/aliases for this emoticon. */
    names: string[];
    /** The text representation (e.g. ":)" or ":D"). */
    surrogates: string;
    /** Whether this emoticon should use sprite sheet rendering. */
    useSpriteSheet: boolean;
}

/**
 * Pending emoji usage waiting to be recorded.
 */
export interface PendingUsage {
    /** Emoji key (name for unicode, id for custom). */
    key: string;
    /** Timestamp in milliseconds when usage occurred. */
    timestamp: number;
}

/**
 * Serializable state for EmojiStore persistence.
 */
export interface EmojiStoreState {
    /** Pending emoji usages not yet committed. */
    pendingUsages: PendingUsage[];
    /** Pending reaction emoji usages not yet committed. */
    emojiReactionPendingUsages: PendingUsage[];
    /** Guild ids with expanded emoji sections in picker. */
    expandedSectionsByGuildIds: Set<string>;
}

/**
 * Context for emoji disambiguation, caching resolved emoji data for a guild context.
 * Provides fast lookup of emojis without triggering data fetches.
 */
export interface DisambiguatedEmojiContext {
    /** User's favorite emojis or null if not loaded. */
    favorites: Emoji[] | null;
    /** Set of favorite emoji names and ids for fast lookup, or null if not loaded. */
    favoriteNamesAndIds: Set<string> | null;
    /** Top emojis for the current guild or null if not loaded. */
    topEmojis: Emoji[] | null;
    /** Current guild id context or null for DMs. */
    guildId: string | null;
    /** Regex-escaped emoticon names for matching. */
    escapedEmoticonNames: string;
    /** All emojis with disambiguation applied (unique names). */
    disambiguatedEmoji: Emoji[];
    /** Compiled regex for matching emoticons or null if none. */
    emoticonRegex: RegExp | null;
    /** Frequently used emojis or null if not loaded. */
    frequentlyUsed: Emoji[] | null;
    /** Frequently used reaction emojis or null if not loaded. */
    frequentlyUsedReactionEmojis: Emoji[] | null;
    /** Set of frequently used reaction emoji names and ids, or null if not loaded. */
    frequentlyUsedReactionNamesAndIds: Set<string> | null;
    /** Unicode emoji aliases keyed by alias name, maps to primary name. */
    unicodeAliases: Record<string, string>;
    /** Custom emojis keyed by emoji id. */
    customEmojis: Record<string, CustomEmoji>;
    /** Custom emojis grouped by guild id. */
    groupedCustomEmojis: Record<string, CustomEmoji[]>;
    /** Emoticons keyed by name for fast lookup. */
    emoticonsByName: Record<string, Emoticon>;
    /** All emojis keyed by name for fast lookup. */
    emojisByName: Record<string, Emoji>;
    /** Custom emojis keyed by id for fast lookup. */
    emojisById: Record<string, CustomEmoji>;
    /** Newly added emojis grouped by guild id. */
    newlyAddedEmoji: Record<string, CustomEmoji[]>;
    /**
     * Checks if an emoji is a favorite without triggering a fetch.
     * @param emoji Emoji to check.
     */
    isFavoriteEmojiWithoutFetchingLatest(emoji: Emoji): boolean;

    /** Gets favorite emojis without triggering a fetch. */
    get favoriteEmojisWithoutFetchingLatest(): Emoji[];
    /** Gets all disambiguated emojis. */
    getDisambiguatedEmoji(): Emoji[];
    /** Gets all custom emojis keyed by name. */
    getCustomEmoji(): Record<string, CustomEmoji>;
    /** Gets custom emojis grouped by guild id. */
    getGroupedCustomEmoji(): Record<string, CustomEmoji[]>;
    /**
     * Gets an emoji by name.
     * @param name Emoji name to look up.
     */
    getByName(name: string): Emoji | undefined;
    /**
     * Gets an emoticon by name.
     * @param name Emoticon name to look up.
     */
    getEmoticonByName(name: string): Emoticon | undefined;
    /**
     * Gets an emoji by id.
     * @param id Emoji id to look up.
     */
    getById(id: string): Emoji | undefined;
    /**
     * Gets the regex for matching custom emoticons.
     * @returns RegExp or null if no emoticons.
     */
    getCustomEmoticonRegex(): RegExp | null;
    /** Gets frequently used emojis without triggering a fetch. */
    getFrequentlyUsedEmojisWithoutFetchingLatest(): Emoji[];
    /** Rebuilds the frequently used reaction emojis cache and returns it. */
    rebuildFrequentlyUsedReactionsEmojisWithoutFetchingLatest(): {
        frequentlyUsedReactionEmojis: Emoji[];
        frequentlyUsedReactionNamesAndIds: Set<string>;
    };
    /** Gets frequently used reaction emojis without triggering a fetch. */
    getFrequentlyUsedReactionEmojisWithoutFetchingLatest(): Emoji[];
    /**
     * Checks if an emoji is frequently used for reactions.
     * @param emoji Emoji to check.
     */
    isFrequentlyUsedReactionEmojiWithoutFetchingLatest(emoji: Emoji): boolean;
    /** Rebuilds the favorite emojis cache and returns it. */
    rebuildFavoriteEmojisWithoutFetchingLatest(): {
        favorites: Emoji[];
        favoriteNamesAndIds: Set<string>;
    };
    /**
     * Gets emojis in priority order (favorites, frequent, top) without fetching.
     * @returns Array of emojis in priority order.
     */
    getEmojiInPriorityOrderWithoutFetchingLatest(): Emoji[];
    /**
     * Gets top emojis for a guild without triggering a fetch.
     * @param guildId Guild id to get top emojis for.
     */
    getTopEmojiWithoutFetchingLatest(guildId: string): Emoji[];
    /**
     * Gets newly added emojis for a specific guild.
     * @param guildId Guild id.
     */
    getNewlyAddedEmojiForGuild(guildId: string): CustomEmoji[];
    /** Gets escaped custom emoticon names for regex matching. */
    getEscapedCustomEmoticonNames(): string;
    /**
     * Checks if a name matches an emoji name chain.
     * @param name Name to match.
     */
    nameMatchesChain(name: string): boolean;
}

/**
 * Search options for emoji search.
 */
export interface EmojiSearchOptions {
    /** Channel context for permission checks. */
    channel: Channel;
    /** Search query string. */
    query: string;
    /** Maximum number of results to return. */
    count?: number;
    /** Intention for using the emoji, affects availability filtering. */
    intention: EmojiIntention;
    /** Whether to include emojis from guilds the user is not in. */
    includeExternalGuilds?: boolean;
    /** Whether to only show unicode emojis in results. */
    showOnlyUnicode?: boolean;
    /**
     * Custom comparator for matching emoji names.
     * @param name Emoji name to compare.
     * @returns True if the name matches.
     */
    matchComparator?(name: string): boolean;
}

/**
 * Search results split by availability.
 */
export interface EmojiSearchResults {
    /** Emojis that are locked (require Nitro or permissions). */
    locked: Emoji[];
    /** Emojis that are available for use. */
    unlocked: Emoji[];
}

/**
 * Metadata about top emojis for a guild.
 */
export interface TopEmojisMetadata {
    /** Array of top emoji ids. */
    emojiIds: string[];
    /** Time-to-live for this data in milliseconds. */
    topEmojisTTL: number;
}

/**
 * Flux store managing all emoji data including custom guild emojis,
 * unicode emojis, favorites, frecency, and search functionality.
 */
export class EmojiStore extends FluxStore {
    /** Array of emoji category names for the picker. */
    get categories(): EmojiCategory[];
    /**
     * Current skin tone modifier surrogate for emoji diversity.
     * Empty string for default yellow, or skin tone modifier (🏻🏼🏽🏾🏿).
     */
    get diversitySurrogate(): string;
    /** Frecency tracker for emoji picker usage. */
    get emojiFrecencyWithoutFetchingLatest(): EmojiFrecency;
    /** Frecency tracker for reaction emoji usage. */
    get emojiReactionFrecencyWithoutFetchingLatest(): EmojiFrecency;
    /** Guild ids with expanded emoji sections in picker. */
    get expandedSectionsByGuildIds(): Set<string>;
    /** Current load state of the emoji store. */
    get loadState(): LoadState;

    /**
     * Gets a custom emoji by its id.
     * @param id Emoji id to look up.
     * @returns The custom emoji if found.
     */
    getCustomEmojiById(id?: string | null): CustomEmoji | undefined;
    /**
     * Gets a usable custom emoji by its id.
     * @param id Emoji id to look up.
     * @returns The custom emoji if found and usable by current user.
     */
    getUsableCustomEmojiById(id?: string | null): CustomEmoji | undefined;
    /**
     * Gets all guild emoji collections keyed by guild id.
     * @returns Record of guild id to GuildEmojis.
     */
    getGuilds(): Record<string, GuildEmojis>;
    /**
     * Gets all custom emojis for a guild.
     * @param guildId Guild id to get emojis for, or null for all guilds.
     * @returns Array of custom emojis.
     */
    getGuildEmoji(guildId?: string | null): CustomEmoji[];
    /**
     * Gets usable custom emojis for a guild.
     * @param guildId Guild id to get emojis for.
     * @returns Array of usable custom emojis.
     */
    getUsableGuildEmoji(guildId?: string | null): CustomEmoji[];
    /**
     * Gets newly added emojis for a guild.
     * @param guildId Guild id to get emojis for.
     * @returns Array of newly added custom emojis.
     */
    getNewlyAddedEmoji(guildId?: string | null): CustomEmoji[];
    /**
     * Gets top emojis for a guild based on usage.
     * @param guildId Guild id to get emojis for.
     * @returns Array of top custom emojis.
     */
    getTopEmoji(guildId?: string | null): CustomEmoji[];
    /**
     * Gets metadata about top emojis for a guild.
     * @param guildId Guild id to get metadata for.
     * @returns Metadata including emoji ids and TTL, or undefined if not cached.
     */
    getTopEmojisMetadata(guildId?: string | null): TopEmojisMetadata | undefined;
    /**
     * Checks if user has any favorite emojis in a guild context.
     * @param guildId Guild id to check.
     * @returns True if user has favorites.
     */
    hasFavoriteEmojis(guildId?: string | null): boolean;
    /**
     * Checks if there are pending emoji usages to be recorded.
     * @returns True if there are pending usages.
     */
    hasPendingUsage(): boolean;
    /**
     * Checks if user has any usable custom emojis in any guild.
     * @returns True if user has usable emojis.
     */
    hasUsableEmojiInAnyGuild(): boolean;
    /** Internal method for ordering search results. */
    getSearchResultsOrder(...args: any[]): any;
    /**
     * Gets the serializable state for persistence.
     * @returns Current store state.
     */
    getState(): EmojiStoreState;
    /**
     * Searches for emojis without triggering data fetches.
     * @param options Search options including query and filters.
     * @returns Search results split by locked/unlocked.
     */
    searchWithoutFetchingLatest(options: EmojiSearchOptions): EmojiSearchResults;
    /**
     * Gets the disambiguated emoji context for a guild.
     * @param guildId Guild id to get context for, or null/undefined for global context.
     */
    getDisambiguatedEmojiContext(guildId?: string | null): DisambiguatedEmojiContext;
}
