import { ApplicationCommandOptionType } from "../../enums";
import { FluxStore, Message } from "..";

/** Slate node type values used in the rich text editor. */
export type SlateNodeType =
    | "text"
    | "line"
    | "s"
    | "u"
    | "strong"
    | "em"
    | "image"
    | "emoji"
    | "customEmoji"
    | "link"
    | "url"
    | "autolink"
    | "highlight"
    | "paragraph"
    | "br"
    | "newline"
    | "escape"
    | "spoiler"
    | "blockQuote"
    | "inlineCode"
    | "codeBlock"
    | "mention"
    | "userMention"
    | "channelMention"
    | "channel"
    | "guild"
    | "attachmentLink"
    | "shopLink"
    | "soundboard"
    | "staticRouteLink"
    | "roleMention"
    | "commandMention"
    | "timestamp"
    | "timestampMentionInput"
    | "list"
    | "heading"
    | "subtext"
    | "silentPrefix"
    | "gameMention"
    | "gameMentionInput"
    | "textMention"
    | "applicationCommandOption";

/** A plain text leaf node. */
export interface SlateTextNode {
    text: string;
}

/** Base interface for Slate element nodes with children. */
export interface SlateBaseElement {
    type: string;
    children: SlateNode[];
}

/** A line element in the editor. */
export interface SlateLineElement extends SlateBaseElement {
    type: "line";
    codeBlockState?: {
        isInCodeBlock: boolean;
    };
}

/** A block quote element. */
export interface SlateBlockQuoteElement extends SlateBaseElement {
    type: "blockQuote";
}

/** An emoji element. */
export interface SlateEmojiElement extends SlateBaseElement {
    type: "emoji";
    emoji: {
        name: string;
        src?: string;
        surrogate: string;
        jumboable?: boolean;
    };
}

/** A custom emoji element. */
export interface SlateCustomEmojiElement extends SlateBaseElement {
    type: "customEmoji";
    emoji: {
        emojiId: string;
        name: string;
        animated: boolean;
        jumboable?: boolean;
    };
}

/** A user mention element. */
export interface SlateUserMentionElement extends SlateBaseElement {
    type: "userMention";
    userId: string;
}

/** A channel mention element. */
export interface SlateChannelMentionElement extends SlateBaseElement {
    type: "channelMention";
    channelId: string;
}

/** A role mention element. */
export interface SlateRoleMentionElement extends SlateBaseElement {
    type: "roleMention";
    roleId: string;
}

/** A text mention element (for @everyone, @here, etc.). */
export interface SlateTextMentionElement extends SlateBaseElement {
    type: "textMention";
    name: string;
}

/** A soundboard element. */
export interface SlateSoundboardElement extends SlateBaseElement {
    type: "soundboard";
    guildId: string;
    soundId: string;
}

/** Timestamp format style characters. */
export type TimestampStyle = "t" | "T" | "d" | "D" | "f" | "F" | "R";

/** Parsed timestamp data. */
export interface ParsedTimestamp {
    /** The Unix timestamp in seconds as a string. */
    timestamp: string;
    /** The format style character. */
    format: TimestampStyle | undefined;
    /** The parsed Moment.js object. */
    parsed: object;
    /** The full formatted date string. */
    full: string;
    /** The formatted string based on the format style. */
    formatted: string;
}

/** A timestamp element. */
export interface SlateTimestampElement extends SlateBaseElement {
    type: "timestamp";
    parsed: ParsedTimestamp;
}

/** A static route link element. */
export interface SlateStaticRouteLinkElement extends SlateBaseElement {
    type: "staticRouteLink";
    id: string;
    itemId?: string;
}

/** A game mention element. */
export interface SlateGameMentionElement extends SlateBaseElement {
    type: "gameMention";
    applicationId: string;
}

/** A timestamp mention input element (while typing). */
export interface SlateTimestampMentionInputElement extends SlateBaseElement {
    type: "timestampMentionInput";
}

/** A game mention input element (while typing). */
export interface SlateGameMentionInputElement extends SlateBaseElement {
    type: "gameMentionInput";
}

/** An application command option element. */
export interface SlateApplicationCommandOptionElement extends SlateBaseElement {
    type: "applicationCommandOption";
    optionType: ApplicationCommandOptionType;
}

/** Union of all Slate element types. */
export type SlateElement =
    | SlateLineElement
    | SlateBlockQuoteElement
    | SlateEmojiElement
    | SlateCustomEmojiElement
    | SlateUserMentionElement
    | SlateChannelMentionElement
    | SlateRoleMentionElement
    | SlateTextMentionElement
    | SlateSoundboardElement
    | SlateTimestampElement
    | SlateTimestampMentionInputElement
    | SlateStaticRouteLinkElement
    | SlateGameMentionElement
    | SlateGameMentionInputElement
    | SlateApplicationCommandOptionElement
    | SlateBaseElement;

/** A Slate node can be either an element or a text leaf. */
export type SlateNode = SlateElement | SlateTextNode;

/** The rich value representation used by Slate editor for message editing. */
export type SlateValue = SlateLineElement[];

export class EditMessageStore extends FluxStore {
    /**
     * Gets the action source that triggered editing for a channel.
     * @param channelId The channel ID.
     * @returns The source string or undefined if not editing.
     */
    getEditActionSource(channelId: string): string | undefined;

    /**
     * Gets the message currently being edited in a channel.
     * @param channelId The channel ID.
     * @returns The message being edited or null if not editing.
     */
    getEditingMessage(channelId: string): Message | null;

    /**
     * Gets the ID of the message currently being edited in a channel.
     * @param channelId The channel ID.
     * @returns The message ID or undefined if not editing.
     */
    getEditingMessageId(channelId: string): string | undefined;

    /**
     * Gets the rich value (Slate editor format) of the editing text.
     * @param channelId The channel ID.
     * @returns The Slate value or undefined if not editing.
     */
    getEditingRichValue(channelId: string): SlateValue | undefined;

    /**
     * Gets the plain text value of the editing text.
     * @param channelId The channel ID.
     * @returns The text value or undefined if not editing.
     */
    getEditingTextValue(channelId: string): string | undefined;

    /**
     * Checks if a specific message is currently being edited.
     * @param channelId The channel ID.
     * @param messageId The message ID to check.
     * @returns True if the specific message is being edited.
     */
    isEditing(channelId: string, messageId: string): boolean;

    /**
     * Checks if any message is currently being edited in a channel.
     * @param channelId The channel ID.
     * @returns True if any message is being edited in the channel.
     */
    isEditingAny(channelId: string): boolean;
}
