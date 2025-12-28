/** Union type for both custom (guild) emojis and unicode emojis. */
export type Emoji = CustomEmoji | UnicodeEmoji;

/**
 * Custom emoji uploaded to a guild.
 */
export interface CustomEmoji {
    /** Discriminator for custom emojis. */
    type: 1;
    /** Whether the emoji is animated (GIF). */
    animated: boolean;
    /** Whether the emoji is available for use. */
    available: boolean;
    /** Guild id this emoji belongs to. */
    guildId: string;
    /** Unique emoji id (snowflake). */
    id: string;
    /** Whether the emoji is managed by an integration (e.g. Twitch). */
    managed: boolean;
    /** Emoji name without colons. */
    name: string;
    /** Original name before any modifications. */
    originalName?: string;
    /** Whether the emoji requires colons to use. */
    require_colons: boolean;
    /** Role ids that can use this emoji (empty array means everyone). */
    roles: string[];
    /** Version number, incremented when emoji is updated. */
    version?: number;
}

/**
 * Built-in unicode emoji.
 */
export interface UnicodeEmoji {
    /** Discriminator for unicode emojis. */
    type: 0;
    /** Skin tone variant emojis keyed by diversity surrogate code (e.g. "1f3fb" for light skin). */
    diversityChildren: Record<string, UnicodeEmoji>;
    /** Raw emoji data from Discord's emoji dataset. */
    emojiObject: EmojiObject;
    /** Index position in the emoji list. */
    index: number;
    /** Unicode surrogate pair(s) for this emoji. */
    surrogates: string;
    /** Unique name identifier for this emoji. */
    uniqueName: string;
    /** Whether to render using sprite sheet. */
    useSpriteSheet: boolean;
    /** Original name if renamed in context. */
    originalName?: string;
    /** Emoji id when used in custom emoji context. */
    id?: string;
    /** Guild id when used in guild context. */
    guildId?: string;
    /** Formatted string of all emoji names. */
    get allNamesString(): string;
    /** Always false for unicode emojis. */
    get animated(): false;
    /** Default skin tone variant or undefined if no diversity. */
    get defaultDiversityChild(): UnicodeEmoji | undefined;
    /** Whether this emoji supports skin tone modifiers. */
    get hasDiversity(): boolean | undefined;
    /** Whether this emoji is a skin tone variant of another. */
    get hasDiversityParent(): boolean | undefined;
    /** Whether this emoji supports multiple diversity modifiers (e.g. handshake with two skin tones). */
    get hasMultiDiversity(): boolean | undefined;
    /** Whether this emoji is a multi-diversity variant of another. */
    get hasMultiDiversityParent(): boolean | undefined;
    /** Always true for unicode emojis. */
    get managed(): true;
    /** Primary emoji name. */
    get name(): string;
    /** All names/aliases for this emoji. */
    get names(): string[];
    /** Surrogate sequence with optional diversity modifier. */
    get optionallyDiverseSequence(): string | undefined;
    /** Unicode version when this emoji was added. */
    get unicodeVersion(): number;
    /** CDN url for emoji image. */
    get url(): string;
    /**
     * Iterates over all diversity variants of this emoji.
     * @param callback Function called for each diversity variant.
     */
    forEachDiversity(callback: (emoji: UnicodeEmoji) => void): void;
    /**
     * Iterates over all names/aliases of this emoji.
     * @param callback Function called for each name.
     */
    forEachName(callback: (name: string) => void): void;
}

/**
 * Raw emoji data from Discord's emoji dataset.
 */
export interface EmojiObject {
    /** All names/aliases for this emoji. */
    names: string[];
    /** Unicode surrogate pair(s). */
    surrogates: string;
    /** Unicode version when this emoji was added. */
    unicodeVersion: number;
    /** Index in the sprite sheet for rendering. */
    spriteIndex?: number;
    /** Whether this emoji supports multiple skin tone modifiers. */
    hasMultiDiversity?: boolean;
    /** Whether this emoji is a diversity variant with a multi-diversity parent. */
    hasMultiDiversityParent?: boolean;
    /** Skin tone modifier codes for this variant (e.g. ["1f3fb"] or ["1f3fb", "1f3fc"]). */
    diversity?: string[];
    /** Sprite indices of diversity children for parent emojis. */
    diversityChildren?: number[];
}
