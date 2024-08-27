/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type MessageFormat from "intl-messageformat";
import type { ReactElement, ReactNode } from "react";
import type { State } from "simple-markdown";

import type { IsAny, IsDomainFinite, Stringable, StringProperties, UnionToIntersection } from "../internal";

export type FormattedMessageArgs = RecordArgs | TupleArgs | string | number;

export declare class FormattedMessage<
    Args extends FormattedMessageArgs = FormattedMessageArgs,
    Markdown extends boolean | undefined = boolean | undefined
> {
    /**
     * @throws {SyntaxError} Argument `message` must be syntactically valid.
     * @see {@link https://formatjs.io/docs/core-concepts/icu-syntax/}
     * @throws {RangeError} Locale identifiers provided to argument `locales` must be structurally valid.
     * @see {@link https://tc39.es/ecma402/#sec-isstructurallyvalidlanguagetag}
     */
    constructor(
        message: string,
        locales?: string | readonly string[] | undefined /* = MessageFormat.defaultLocale */,
        ...hasMarkdown: undefined extends Markdown
            ? [hasMarkdown?: Markdown]
            : [hasMarkdown: Markdown]
    );

    /**
     * @throws {RangeError | TypeError}
     * @see {@link format}
     */
    astFormat(...args: FormatArgs<Args>): ASTNode;
    /**
     * @throws {RangeError} Values provided to arguments with type date or time must be valid time values.
     * @throws {TypeError} Values provided to arguments with type plural, select, or selectordinal must match one of their matches.
     */
    format(...args: FormatArgs<Args>): Markdown extends true
        ? (string | ReactElement)[]
        : string;
    getContext<Values extends RecordArgs>(values: Values): [
        { [Key in keyof Values]: Values[Key] | (Key & keyof MessageValues<Args> extends never ? never : number); },
        Record<number, Values[keyof Values & keyof MessageValues<Args>]>
    ];
    /**
     * @throws {RangeError | TypeError}
     * @see {@link format}
     */
    plainFormat(...args: FormatArgs<Args>): string;

    hasMarkdown: Markdown;
    intlMessage: MessageFormat;
    message: string;
}

type RecordArgs = Record<string | number, GenericValue>;
type TupleArgs = readonly [stringableArgs: string | number, hookArgs: string | number];

type GenericValue = Stringable | HookValue;
type HookValue = (result: ReactNode, key: State["key"]) => ReactNode;

type FormatArgs<Args extends FormattedMessageArgs>
    = unknown extends IsAny<Args>
        ? [values?: RecordArgs]
        : [Args] extends [never]
            ? []
            : keyof MessageValues<Args> extends never
                ? []
                : unknown extends IsDomainFinite<keyof MessageValues<Args>>
                    ? [values: MessageValues<Args>]
                    : [values: never];

type MessageValues<Args extends FormattedMessageArgs> = UnionToIntersection<
    Args extends string | number
        ? Record<Args, Stringable>
        : Args extends TupleArgs
            ? Record<Args[0], Stringable> & Record<Args[1], HookValue>
            : Required<StringProperties<Args>>
>;

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
