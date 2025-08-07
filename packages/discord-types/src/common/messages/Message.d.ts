import { CommandOption } from './Commands';
import { User, UserJSON } from '../User';
import { Embed, EmbedJSON } from './Embed';
import { DiscordRecord } from "../Record";
import { StickerFormatType } from "../../../enums";

/**
 * TODO: looks like discord has moved over to Date instead of Moment;
 */
export class Message extends DiscordRecord {
    constructor(message: object);
    activity: unknown;
    application: unknown;
    applicationId: string | unknown;
    attachments: MessageAttachment[];
    author: User;
    blocked: boolean;
    bot: boolean;
    call: {
        duration: moment.Duration;
        endedTimestamp: moment.Moment;
        participants: string[];
    };
    channel_id: string;
    /**
     * NOTE: not fully typed
     */
    codedLinks: {
        code?: string;
        type: string;
    }[];
    colorString: unknown;
    components: unknown[];
    content: string;
    customRenderedContent: unknown;
    editedTimestamp: Date;
    embeds: Embed[];
    flags: number;
    giftCodes: string[];
    id: string;
    interaction: {
        id: string;
        name: string;
        type: number;
        user: User;
    }[] | undefined;
    interactionData: {
        application_command: {
            application_id: string;
            default_member_permissions: unknown;
            default_permission: boolean;
            description: string;
            dm_permission: unknown;
            id: string;
            name: string;
            options: CommandOption[];
            permissions: unknown[];
            type: number;
            version: string;
        };
        attachments: MessageAttachment[];
        guild_id: string | undefined;
        id: string;
        name: string;
        options: {
            focused: unknown;
            name: string;
            type: number;
            value: string;
        }[];
        type: number;
        version: string;
    }[];
    interactionError: unknown[];
    isSearchHit: boolean;
    loggingName: unknown;
    mentionChannels: string[];
    mentionEveryone: boolean;
    mentionRoles: string[];
    mentioned: boolean;
    mentions: string[];
    messageReference: {
        guild_id?: string;
        channel_id: string;
        message_id: string;
    } | undefined;
    messageSnapshots: {
        message: Message;
    }[];
    nick: unknown; // probably a string
    nonce: string | undefined;
    pinned: boolean;
    reactions: MessageReaction[];
    state: string;
    stickerItems: {
        format_type: StickerFormatType;
        id: string;
        name: string;
    }[];
    stickers: unknown[];
    timestamp: moment.Moment;
    tts: boolean;
    type: number;
    webhookId: string | undefined;

    /**
     *  Doesn't actually update the original message; it just returns a new message instance with the added reaction.
     */
    addReaction(emoji: ReactionEmoji, fromCurrentUser: boolean): Message;
    /**
     * Searches each reaction and if the provided string has an index above -1 it'll return the reaction object.
     */
    getReaction(name: string): MessageReaction;
    /**
     * Doesn't actually update the original message; it just returns the message instance without the reaction searched with the provided emoji object.
     */
    removeReactionsForEmoji(emoji: ReactionEmoji): Message;
    /**
     * Doesn't actually update the original message; it just returns the message instance without the reaction.
     */
    removeReaction(emoji: ReactionEmoji, fromCurrentUser: boolean): Message;

    getChannelId(): string;
    hasFlag(flag: number): boolean;
    isCommandType(): boolean;
    isEdited(): boolean;
    isSystemDM(): boolean;
}

/** A smaller Message object found in FluxDispatcher and elsewhere. */
export interface MessageJSON {
    attachments: MessageAttachment[];
    author: UserJSON;
    channel_id: string;
    components: unknown[];
    content: string;
    edited_timestamp: string;
    embeds: EmbedJSON[];
    flags: number;
    guild_id: string | undefined;
    id: string;
    loggingName: unknown;
    member: {
        avatar: string | undefined;
        communication_disabled_until: string | undefined;
        deaf: boolean;
        hoisted_role: string | undefined;
        is_pending: boolean;
        joined_at: string;
        mute: boolean;
        nick: string | boolean;
        pending: boolean;
        premium_since: string | undefined;
        roles: string[];
    } | undefined;
    mention_everyone: boolean;
    mention_roles: string[];
    mentions: UserJSON[];
    message_reference: {
        guild_id?: string;
        channel_id: string;
        message_id: string;
    } | undefined;
    nonce: string | undefined;
    pinned: boolean;
    referenced_message: MessageJSON | undefined;
    state: string;
    timestamp: string;
    tts: boolean;
    type: number;
}

export interface MessageAttachment {
    filename: string;
    id: string;
    proxy_url: string;
    size: number;
    spoiler: boolean;
    url: string;
    content_type?: string;
    width?: number;
    height?: number;
}

export interface ReactionEmoji {
    id: string | undefined;
    name: string;
    animated: boolean;
}

export interface MessageReaction {
    count: number;
    emoji: ReactionEmoji;
    me: boolean;
}
