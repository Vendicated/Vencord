/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../../internal";

export type Emoji = UnicodeEmoji | GuildEmoji;

// Original name: Emoji
export class UnicodeEmoji {
    constructor(emojiObject: UnicodeEmojiObject | UnicodeEmojiObjectDiversityChild);

    get allNamesString(): string;
    get animated(): false;
    get defaultDiversityChild(): UnicodeEmojiObjectDiversityChild | Nullish;
    forEachDiversity(callback: (value: string, index: number, array: string[]) => unknown): any;
    forEachName(callback: (value: string, index: number, array: string[]) => unknown): void;
    get hasDiversity(): UnicodeEmojiObject["hasDiversity"];
    get hasDiversityParent(): UnicodeEmojiObjectDiversityChild["hasDiversityParent"];
    get hasMultiDiversity(): UnicodeEmojiObject["hasMultiDiversity"];
    get hasMultiDiversityParent(): UnicodeEmojiObjectDiversityChild["hasMultiDiversityParent"];
    get managed(): true;
    get name(): string;
    get names(): UnicodeEmojiObject["names"];
    get optionallyDiverseSequence(): string;
    setSpriteSheetIndex(index: number): void;
    get unicodeVersion(): number;
    get url(): string;

    diversityChildren: { [diversity: string]: UnicodeEmojiObjectDiversityChild; };
    emojiObject: UnicodeEmojiObject;
    guildId: undefined;
    id: undefined;
    index: number | undefined;
    originalName: string | undefined;
    surrogates: string;
    type: EmojiType.UNICODE;
    uniqueName: string;
    useSpriteSheet: boolean | undefined;
}

export interface UnicodeEmojiObject {
    diversityChildren?: UnicodeEmojiObjectDiversityChild[];
    hasDiversity?: boolean;
    hasMultiDiversity?: boolean;
    names: [string, ...string[]];
    surrogates: string;
    unicodeVersion?: number;
}

export interface UnicodeEmojiObjectDiversityChild extends Pick<UnicodeEmojiObject, "names" | "surrogates" | "unicodeVersion"> {
    diversity: [string, string?];
    hasDiversityParent?: boolean;
    hasMultiDiversityParent?: boolean;
}

export interface GuildEmoji {
    allNamesString: string;
    animated: boolean;
    available: boolean;
    guildId: string;
    id: string;
    managed: false;
    name: string;
    originalName?: string;
    /** False for emoticons. */
    require_colons: boolean;
    roles: string[];
    type: EmojiType.GUILD;
}

// Original name: EmojiTypes
export const enum EmojiType {
    UNICODE = 0,
    GUILD = 1,
}
