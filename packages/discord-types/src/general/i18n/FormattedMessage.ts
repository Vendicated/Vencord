/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type MessageFormat from "intl-messageformat";
import type { ReactElement, ReactNode } from "react";
import type { State } from "simple-markdown";
import type { ValueOf } from "type-fest";

import type { Stringable } from "../../internal";

type HookValue = (result: ReactNode, key: State["key"]) => ReactNode;
type GenericValue = Stringable | HookValue;
type GenericArgs = Record<string, GenericValue> | [stringableArgs: string, hookArgs: string] | string;

export declare class FormattedMessage<
    Args extends GenericArgs = string,
    Markdown extends boolean | undefined = boolean
> {
    /**
     * @throws {SyntaxError} Argument `message` must be syntactically valid.
     * @see {@link https://formatjs.io/docs/core-concepts/icu-syntax/}
     * @throws {RangeError} Locale identifiers provided to argument `locales` must be structurally valid.
     * @see {@link https://tc39.es/ecma402/#sec-isstructurallyvalidlanguagetag}
     */
    constructor(
        message: string,
        locales?: string | string[] /* = MessageFormat.defaultLocale */,
        hasMarkdown?: Markdown
    );

    /**
     * @throws {RangeError | TypeError}
     * @see {@link format}
     */
    astFormat(...values: FormatValues<Args>): ASTNode;
    /**
     * @throws {RangeError} Values provided to arguments with type date or time must be valid time values.
     * @throws {TypeError} Values provided to arguments with type plural, select, or selectordinal must match one of their matches.
     */
    format(...values: FormatValues<Args>): Markdown extends true
        ? (string | ReactElement)[]
        : string;
    getContext(values: ContextValues<Args>): [
        { [Key in keyof ContextValues<Args>]: ContextValues<Args>[Key] | number; },
        Record<number, ValueOf<ContextValues<Args>>>
    ];
    /**
     * @throws {RangeError | TypeError}
     * @see {@link format}
     */
    plainFormat(...values: FormatValues<Args>): string;

    hasMarkdown: Markdown;
    intlMessage: MessageFormat;
    message: string;
}

type FormatValues<Args extends GenericArgs>
    = [Args] extends [[never, never]]
        ? []
        : [Args] extends [string]
            ? [Args] extends [`${infer _}`]
                ? [values: Record<Args, Stringable>]
                : [values?: Record<string, GenericValue>]
            : [Args] extends [[string, string]]
                ? [values: Record<Args[0], Stringable> & Record<Args[1], HookValue>]
                : [values: Args];

type ContextValues<Args extends GenericArgs>
    = [Args] extends [string]
        ? [Args] extends [`${infer _}`]
            ? Record<Args, Stringable>
            : Record<string, GenericValue>
        : [Args] extends [[string, string]]
            ? Record<Args[0], Stringable> & Record<Args[1], HookValue>
            : Args;

/** @todo Add types for every type of ASTNode. */
export interface ASTNode<Type extends ASTNodeType = ASTNodeType> extends Record<string, any> {
    type: Type;
}

// Original name: AST_KEY
/** @todo There may be more undocumented types. */
export enum ASTNodeType {
    ATTACHMENT_LINK = "attachmentLink",
    AUTOLINK = "autolink",
    BLOCK_QUOTE = "blockQuote",
    LINE_BREAK = "br",
    CHANNEL = "channel",
    CHANNEL_MENTION = "channelMention",
    CODE_BLOCK = "codeBlock",
    COMMAND_MENTION = "commandMention",
    CUSTOM_EMOJI = "customEmoji",
    ITALICS = "em",
    EMOJI = "emoji",
    ESCAPE = "escape",
    GUILD = "guild",
    HEADING = "heading",
    HIGHLIGHT = "highlight",
    HOOK = "hook", // Undocumented
    IMAGE = "image",
    INLINE_CODE = "inlineCode",
    LINK = "link",
    LIST = "list",
    MENTION = "mention",
    NEWLINE = "newline",
    PARAGRAPH = "paragraph",
    ROLE_MENTION = "roleMention",
    STRIKETHROUGH = "s",
    SOUNDBOARD = "soundboard",
    SPOILER = "spoiler",
    STATIC_ROUTE_LINK = "staticRouteLink",
    STRONG = "strong",
    SUBTEXT = "subtext",
    TEXT = "text",
    TIMESTAMP = "timestamp",
    UNDERLINE = "u",
    URL = "url",
}
