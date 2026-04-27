import { CommandOption } from './Commands';
import { User, UserJSON } from '../User';
import { Embed, EmbedJSON } from './Embed';
import { DiscordRecord } from "../Record";
import { ApplicationCommandOptionType, ApplicationCommandType, ApplicationIntegrationType, ButtonStyle, ComponentType, InteractionType, MessageActivityType, MessageFlags, MessageReferenceType, MessageType, PollLayoutType, StickerFormatType } from "../../../enums";

export type MessageState = "SENT" | "SENDING" | "SEND_FAILED";

export type CodedLinkType =
    | "INVITE"
    | "TEMPLATE"
    | "BUILD_OVERRIDE"
    | "MANUAL_BUILD_OVERRIDE"
    | "EXPERIMENT"
    | "EVENT"
    | "CHANNEL_LINK"
    | "APP_DIRECTORY_PROFILE"
    | "APP_DIRECTORY_STOREFRONT"
    | "APP_DIRECTORY_STOREFRONT_SKU"
    | "APP_OAUTH2_LINK"
    | "ACTIVITY_BOOKMARK"
    | "EMBEDDED_ACTIVITY_INVITE"
    | "GUILD_PRODUCT"
    | "SERVER_SHOP"
    | "SOCIAL_LAYER_STOREFRONT"
    | "QUESTS_EMBED"
    | "COLLECTIBLES_SHOP";

export interface MessageActivity {
    type: MessageActivityType;
    party_id?: string;
}

export interface PollMedia {
    text?: string;
    emoji?: ReactionEmoji;
}

export interface PollAnswer {
    answer_id: number;
    poll_media: PollMedia;
}

export interface Poll {
    question: PollMedia;
    answers: PollAnswer[];
    expiry: string;
    allow_multiselect: boolean;
    layout_type: PollLayoutType;
}

export interface RoleSubscriptionData {
    role_subscription_listing_id: string;
    tier_name: string;
    total_months_subscribed: number;
    is_renewal: boolean;
}

export interface MessageComponent {
    type: ComponentType;
    id?: string;
    custom_id?: string;
    disabled?: boolean;
    style?: ButtonStyle;
    label?: string;
    emoji?: ReactionEmoji;
    url?: string;
    options?: { label: string; value: string; description?: string; emoji?: ReactionEmoji; default?: boolean; }[];
    placeholder?: string;
    min_values?: number;
    max_values?: number;
    components?: MessageComponent[];
}

/*
 * TODO: looks like discord has moved over to Date instead of Moment;
 */
export class Message extends DiscordRecord {
    constructor(message: object);
    activity: MessageActivity | null;
    activityInstance: { applicationId: string; instanceId: string; } | null;
    application: { id: string; name: string; icon: string | null; } | null;
    applicationId: string | null;
    attachments: MessageAttachment[];
    author: User;
    blocked: boolean;
    bot: boolean;
    call: {
        duration: number | null;
        endedTimestamp: Date | null;
        participants: string[];
    } | null;
    changelogId: string | null;
    channel_id: string;
    /**
     * NOTE: not fully typed
     */
    codedLinks: {
        code?: string;
        type: CodedLinkType;
    }[];
    colorString: string | null;
    components: MessageComponent[];
    content: string;
    customRenderedContent: {
        content: React.ReactNode;
        [key: string]: unknown;
    } | null;
    editedTimestamp: Date | null;
    embeds: Embed[];
    flags: MessageFlags;
    giftCodes: string[];
    giftInfo: { sku_id: string; slug: string; } | null;
    giftingPrompt: { recipientUserId: string; } | null;
    id: string;
    interaction: {
        id: string;
        name: string;
        type: InteractionType;
        user: User;
    }[] | null;
    interactionData: {
        application_command: {
            application_id: string;
            default_member_permissions: string | null;
            default_permission: boolean;
            description: string;
            dm_permission: boolean | null;
            id: string;
            name: string;
            options: CommandOption[];
            permissions: string[];
            type: ApplicationCommandType;
            version: string;
        };
        attachments: MessageAttachment[];
        guild_id: string | undefined;
        id: string;
        name: string;
        options: {
            focused: boolean | undefined;
            name: string;
            type: ApplicationCommandOptionType;
            value: string;
        }[];
        type: InteractionType;
        version: string;
    }[] | null;
    interactionMetadata: {
        id: string;
        type: InteractionType;
        name?: string;
        command_type?: ApplicationCommandType;
        ephemerality_reason?: number;
        user: User;
        authorizing_integration_owners: Record<ApplicationIntegrationType, string>;
        original_response_message_id?: string;
        interacted_message_id?: string;
        target_user?: User;
        target_message_id?: string;
    } | null;
    interactionError: string[] | null;
    ignored: boolean;
    isSearchHit: boolean;
    isUnsupported: boolean;
    loggingName: string | null;
    mentionChannels: string[];
    mentionEveryone: boolean;
    mentionGames: { id: string; name: string; }[];
    mentionRoles: string[];
    mentioned: boolean;
    mentions: string[];
    messageReference: {
        type?: MessageReferenceType;
        guild_id?: string;
        channel_id: string;
        message_id: string;
    } | undefined;
    messageSnapshots: {
        message: Message;
    }[];
    nick: string | null;
    nonce: string | undefined;
    pinned: boolean;
    poll: Poll | null;
    potions: { id: string; expiresAt: string; }[];
    premiumGroupInviteId: string | null;
    purchaseNotification: { type: number; guild_product_purchase?: { product_name: string; }; } | null;
    reactions: MessageReaction[];
    referralTrialOfferId: string | null;
    roleSubscriptionData: RoleSubscriptionData | null;
    sharedClientTheme: { primary_color: number; secondary_color: number; } | null;
    soundboardSounds: { sound_id: string; volume: number; emoji_id?: string; emoji_name?: string; }[];
    state: MessageState;
    stickerItems: {
        format_type: StickerFormatType;
        id: string;
        name: string;
    }[];
    stickers: { id: string; name: string; format_type: StickerFormatType; }[];
    timestamp: Date;
    tts: boolean;
    type: MessageType;
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
    getContentMessage(): Message;
    hasFlag(flag: MessageFlags): boolean;
    hasPotions(): boolean;
    isCommandType(): boolean;
    isEdited(): boolean;
    isFirstMessageInForumPost(channel: unknown): boolean;
    isInteractionPlaceholder(): boolean;
    isPoll(): boolean;
    isSystemDM(): boolean;
    canDeleteOwnMessage(userId: string): boolean;
    userHasReactedWithEmoji(emoji: ReactionEmoji, burst?: boolean): boolean;
    addReactionBatch(reactions: { emoji: ReactionEmoji; users: string[]; }[], burstReactions: { emoji: ReactionEmoji; users: string[]; }[]): Message;

    /** Vencord added */
    deleted?: boolean;
}

/** A smaller Message object found in FluxDispatcher and elsewhere. */
export interface MessageJSON {
    attachments: MessageAttachment[];
    author: UserJSON;
    channel_id: string;
    components: MessageComponent[];
    content: string;
    edited_timestamp: string;
    embeds: EmbedJSON[];
    flags: MessageFlags;
    guild_id: string | undefined;
    id: string;
    loggingName: string | null;
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
    state: MessageState;
    timestamp: string;
    tts: boolean;
    type: MessageType;
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

// Object.keys(findByProps("REPLYABLE")).map(JSON.stringify).join("|")
export type MessageTypeSets = Record<
    "UNDELETABLE" | "GUILD_DISCOVERY_STATUS" | "USER_MESSAGE" | "NOTIFIABLE_SYSTEM_MESSAGE" | "REPLYABLE" | "FORWARDABLE" | "REFERENCED_MESSAGE_AVAILABLE" | "AVAILABLE_IN_GUILD_FEED" | "DEADCHAT_PROMPTS" | "NON_COLLAPSIBLE" | "NON_PARSED" | "AUTOMOD_INCIDENT_ACTIONS" | "SELF_MENTIONABLE_SYSTEM" | "SCHEDULABLE",
    Set<MessageType>
>;
