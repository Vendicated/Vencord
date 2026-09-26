/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// NOTE FOR OTHER PEOPLE:
// These types have NOT been tested under every circumstance. Here is the testing string I used to get these types:

// # Hello this is a heading
// -# This is a small heading
// Heres some normal text
// https://google.com heres a link
// [heres some cover text](https://google.fi)
// ** Here is some bold text **
// *Heres some italic text*

// - Heres a list item
// :smile:


interface ParseOptions {
    messageId: string,
    channelId: string,
    allowLinks: boolean,
    allowDevLinks: boolean,
    formatInline: boolean,
    noStyleAndInteraction: boolean,
    allowHeading: boolean,
    previewLinkTarget: boolean,
    disableAnimatedEmoji: boolean,
    isInteracting: boolean,
    allowList: boolean,
    allowEmojiLinks: boolean,
    disableAutoBlockNewlines: boolean,
    mentionChannels: any[],
    soundboardSounds: any[],
    muted: boolean,
    unknownUserMentionPlaceholder: boolean,
    viewingChannelId: string,
    forceWhite: boolean;
}

type MatchResult = {
    [key: number]: string, // "4": "example content"
    index: number, // 4
};

interface LinkContent {
    content: string, // "https://google.com/"
    type: "text";
}

interface FormattedtextResult {
    content: Array<TextParseResult>;
    type: "strong" | "em" | "subtext";
}

interface TextParseResult {
    content: string,
    originalMatch: MatchResult;
    type: "text";
}

interface LinkParseResult {
    content: LinkContent[];
    target: string, // "https://google.com/"
    title?: unknown, // I've never seen this be anything else than undefined
    type: "link";
}

interface EmojiParseResult {
    name: string, // ":smile:"
    originalMatch: MatchResult,
    src: string, // "/assets/58a76b2430663605.svg"
    surrogate: string, // "😄"
    type: "emoji";
}


interface ParserType {
    parseToAST(input: string, inline: boolean, options: Partial<ParseOptions>): Array<FormattedtextResult | TextParseResult | LinkParseResult | EmojiParseResult>;
}
