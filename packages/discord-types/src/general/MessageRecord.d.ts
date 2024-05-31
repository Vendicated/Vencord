/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Duration, Moment } from "moment";
import type { SnakeCasedProperties } from "type-fest";

import type { Nullish } from "../internal";
import type { ApplicationIntegrationType } from "./ApplicationRecord";
import type { ChannelRecord, ChannelType } from "./channels";
import type { ImmutableRecord } from "./ImmutableRecord";
import type { UserRecord } from "./UserRecord";

export type MessageRecordOwnProperties = Pick<MessageRecord, "activity" | "activityInstance" | "application" | "applicationId" | "attachments" | "author" | "blocked" | "bot" | "call" | "changelogId" | "channel_id" | "codedLinks" | "colorString" | "components" | "content" | "customRenderedContent" | "editedTimestamp" | "embeds" | "flags" | "giftCodes" | "giftInfo" | "id" | "interaction" | "interactionData" | "interactionError" | "interactionMetadata" | "isSearchHit" | "isUnsupported" | "loggingName" | "mentionChannels" | "mentionEveryone" | "mentionRoles" | "mentioned" | "mentions" | "messageReference" | "messageSnapshots" | "nick" | "nonce" | "pinned" | "poll" | "purchaseNotification" | "reactions" | "referralTrialOfferId" | "roleSubscriptionData" | "state" | "stickerItems" | "stickers" | "timestamp" | "tts" | "type" | "webhookId">;

export class MessageRecord<
    OwnProperties extends MessageRecordOwnProperties = MessageRecordOwnProperties
> extends ImmutableRecord<OwnProperties> {
    constructor(messageProperties: Record<string, any>); // TEMP

    addReaction(e?: any, t?: any, n?: any, r?: any): this; // TEMP
    addReactionBatch(e?: any, t?: any): any; // TEMP
    canDeleteOwnMessage(userId: string): boolean;
    getChannelId(): string;
    getReaction(e?: any): any; // TEMP
    hasFlag(flag: MessageFlags): boolean;
    isCommandType(): boolean;
    isEdited(): boolean;
    isFirstMessageInForumPost(channel: ChannelRecord): boolean; // TEMP
    isInteractionPlaceholder(): boolean;
    isPoll(): boolean;
    isSystemDM(): boolean;
    isUIKitComponents(): boolean;
    removeReaction(e?: any, t?: any, n?: any): this; // TEMP
    removeReactionsForEmoji(e?: any): this; // TEMP
    toJS(): OwnProperties & SnakeCasedProperties<Pick<OwnProperties, "editedTimestamp" | "mentionEveryone" | "webhookId">>;
    userHasReactedWithEmoji(e?: any, t?: any): boolean; // TEMP

    activity: any/* | null*/; // TEMP
    activityInstance: any/* | null*/; // TEMP
    application: any/* | null*/; // TEMP
    applicationId: string | null; // TEMP
    attachments: MessageAttachment[];
    author: UserRecord;
    blocked: boolean;
    bot: boolean;
    call: MessageCall | null;
    changelogId: string | null;
    channel_id: string;
    codedLinks: CodedLink[];
    colorString: string | undefined;
    components: MessageComponent[];
    content: string;
    customRenderedContent: any/* | undefined*/; // TEMP
    editedTimestamp: Date | null;
    embeds: MessageEmbed[];
    flags: MessageFlags;
    giftCodes: string[];
    giftInfo: MessageGiftInfo | undefined;
    id: string;
    interaction: InteractionRecord | null;
    interactionData: InteractionData | null;
    interactionError: string | null;
    interactionMetadata: InteractionMetadata | null;
    isSearchHit: boolean;
    isUnsupported: boolean;
    loggingName: string | null; // TEMP
    mentionChannels: ChannelMention[];
    mentioned: boolean;
    mentionEveryone: boolean;
    mentionRoles: string[];
    mentions: string[];
    messageReference: MessageReference | null;
    messageSnapshots: any[]; // TEMP
    nick: any/* | undefined */; // TEMP
    nonce: string | number | null;
    pinned: boolean;
    poll: MessagePoll | undefined;
    purchaseNotification: MessagePurchaseNotification | undefined;
    reactions: MessageReaction[];
    referralTrialOfferId: string | null; // TEMP
    roleSubscriptionData: MessageRoleSubscriptionData | undefined;
    state: MessageStates;
    stickerItems: MessageStickerItem[];
    stickers: MessageSticker[];
    timestamp: Date;
    tts: boolean;
    type: MessageTypes;
    webhookId: string | null;
}

export const enum MessageAttachmentFlags {
    IS_CLIP = 1 << 0,
    IS_THUMBNAIL = 1 << 1,
    IS_REMIX = 1 << 2,
    IS_SPOILER = 1 << 3,
    CONTAINS_EXPLICIT_MEDIA = 1 << 4,
}

export interface MessageAttachment {
    content_scan_version?: number;
    content_type?: string;
    description?: string;
    duration_secs?: number;
    ephemeral?: boolean;
    filename: string;
    flags?: MessageAttachmentFlags;
    height?: number | null;
    id: string;
    placeholder?: string;
    placeholder_version?: number;
    proxy_url: string;
    size: number;
    spoiler: boolean;
    url: string;
    waveform?: string;
    width?: number | null;
}

export interface MessageCall {
    duration: Duration | null;
    endedTimestamp: Moment | null;
    participants: string[];
}

export const enum CodedLinkType {
    ACTIVITY_BOOKMARK = "ACTIVITY_BOOKMARK",
    APP_DIRECTORY_PROFILE = "APP_DIRECTORY_PROFILE",
    BUILD_OVERRIDE = "BUILD_OVERRIDE",
    CHANNEL_LINK = "CHANNEL_LINK",
    EMBEDDED_ACTIVITY_INVITE = "EMBEDDED_ACTIVITY_INVITE",
    EVENT = "EVENT",
    GUILD_PRODUCT = "GUILD_PRODUCT",
    INVITE = "INVITE",
    MANUAL_BUILD_OVERRIDE = "MANUAL_BUILD_OVERRIDE",
    QUESTS_EMBED = "QUESTS_EMBED",
    SERVER_SHOP = "SERVER_SHOP",
    TEMPLATE = "TEMPLATE",
}

export interface CodedLink {
    code: string;
    type: CodedLinkType;
}

export interface MessageComponentEmoji {
    animated: boolean | undefined;
    id: string | undefined;
    name: string | undefined;
    src: string | undefined;
}

// Original name: ComponentType
// Renamed to avoid name conflicts with ComponentType from React.
export const enum MessageComponentType {
    ACTION_ROW = 1,
    BUTTON = 2,
    STRING_SELECT = 3,
    INPUT_TEXT = 4,
    USER_SELECT = 5,
    ROLE_SELECT = 6,
    MENTIONABLE_SELECT = 7,
    CHANNEL_SELECT = 8,
    TEXT = 10,
    MEDIA_GALLERY = 12,
    SEPARATOR = 14,
}

export interface MessageActionRowComponent {
    components: Exclude<MessageComponent, MessageActionRowComponent>[];
    id: string;
    type: MessageComponentType.ACTION_ROW;
}

export const enum ButtonStyle {
    PRIMARY = 1,
    SECONDARY = 2,
    SUCCESS = 3,
    DESTRUCTIVE = 4,
    LINK = 5,
    PREMIUM = 6,
}

/**
 * @todo
 * Must have one of either `customId` or `url`, but never both.
 * If a button has `url` it must have the `Link` button style.
 */
export interface MessageButtonComponent {
    customId: string | undefined;
    disabled: boolean | undefined;
    emoji: MessageComponentEmoji | undefined;
    id: string;
    label: string | undefined;
    style: ButtonStyle;
    type: MessageComponentType.BUTTON;
    url: string | undefined;
}

export const enum SelectOptionType {
    STRING = 1,
    USER = 2,
    ROLE = 3,
    CHANNEL = 4,
    GUILD = 5,
}

export interface SelectMenuOption<OptionType extends SelectOptionType = SelectOptionType> {
    default: boolean | undefined;
    description: string | undefined;
    emoji: MessageComponentEmoji | undefined;
    label: string;
    type: OptionType;
    value: string;
}

export interface MessageStringSelectComponent {
    customId: string;
    disabled: boolean | undefined;
    id: string;
    maxValues: number | undefined;
    minValues: number | undefined;
    options: SelectMenuOption<SelectOptionType.STRING>[];
    placeholder: string;
    type: MessageComponentType.STRING_SELECT;
}

export const enum TextComponentStyle {
    SMALL = 1,
    PARAGRAPH = 2,
}

export interface MessageTextInputComponent {
    customId: string;
    disabled: boolean | undefined;
    id: string;
    label: string;
    maxLength: number | undefined;
    minLength: number | undefined;
    placeholder: string | undefined;
    required: boolean;
    style: TextComponentStyle;
    type: MessageComponentType.INPUT_TEXT;
    value: string | undefined;
}

// Original name: SnowflakeSelectDefaultValueTypes
export const enum SnowflakeSelectDefaultValueType {
    CHANNEL = "channel",
    ROLE = "role",
    USER = "user",
}

export interface SelectMenuDefaultValue<DefaultValueType extends SnowflakeSelectDefaultValueType = SnowflakeSelectDefaultValueType> {
    id: string;
    type: DefaultValueType;
}

export interface MessageUserSelectComponent {
    customId: string;
    defaultValues: SelectMenuDefaultValue<SnowflakeSelectDefaultValueType.USER>[];
    disabled: boolean | undefined;
    id: string;
    maxValues: number | undefined;
    minValues: number | undefined;
    placeholder: string;
    type: MessageComponentType.USER_SELECT;
}

export interface MessageRoleSelectComponent {
    customId: string;
    defaultValues: SelectMenuDefaultValue<SnowflakeSelectDefaultValueType.ROLE>[];
    disabled: boolean | undefined;
    id: string;
    maxValues: number | undefined;
    minValues: number | undefined;
    placeholder: string;
    type: MessageComponentType.ROLE_SELECT;
}

export interface MessageMentionableSelectComponent {
    customId: string;
    defaultValues: SelectMenuDefaultValue<SnowflakeSelectDefaultValueType.ROLE | SnowflakeSelectDefaultValueType.USER>[];
    disabled: boolean | undefined;
    id: string;
    maxValues: number | undefined;
    minValues: number | undefined;
    placeholder: string;
    type: MessageComponentType.MENTIONABLE_SELECT;
}

export interface MessageChannelSelectComponent {
    channelTypes: ChannelType[] | undefined;
    customId: string;
    defaultValues: SelectMenuDefaultValue<SnowflakeSelectDefaultValueType.CHANNEL>[];
    disabled: boolean | undefined;
    id: string;
    maxValues: number | undefined;
    minValues: number | undefined;
    placeholder: string;
    type: MessageComponentType.CHANNEL_SELECT;
}

export interface MessageTextComponent {
    content: string | undefined;
    id: string;
    type: MessageComponentType.TEXT;
}

export const enum ContentScanFlags {
    EXPLICIT = 1,
}

export interface MediaItem {
    contentScanMetadata: {
        contentScanFlags: ContentScanFlags | undefined;
        version: number | undefined;
    } | undefined;
    contentType: string | undefined;
    height: number | Nullish;
    placeholder: string | undefined;
    placeholderVersion: number | undefined;
    proxyUrl: string;
    url: string;
    width: number | Nullish;
}

export interface MessageMediaGalleryComponent {
    id: string;
    items: {
        description: string | undefined;
        media: MediaItem;
        spoiler: boolean;
    }[];
    type: MessageComponentType.MEDIA_GALLERY;
}

export const enum SeparatorSpacingSize {
    SMALL = 1,
    LARGE = 2,
}

export interface MessageSeparatorComponent {
    divider: boolean;
    id: string;
    spacing: SeparatorSpacingSize;
    type: MessageComponentType.SEPARATOR;
}

export type MessageComponent = MessageActionRowComponent | MessageButtonComponent | MessageStringSelectComponent | MessageTextInputComponent | MessageUserSelectComponent | MessageRoleSelectComponent | MessageMentionableSelectComponent | MessageChannelSelectComponent | MessageTextComponent | MessageMediaGalleryComponent | MessageSeparatorComponent;

export interface MessageEmbedAuthor {
    iconProxyURL: string | undefined;
    iconURL: string | undefined;
    name: string;
    url: string | undefined;
}

export interface MessageEmbedField {
    inline: boolean | undefined;
    rawName: string;
    rawValue: string;
}

export const enum MessageEmbedFlags {
    CONTAINS_EXPLICIT_MEDIA = 1 << 4,
}

export interface MessageEmbedFooter {
    iconProxyURL: string | undefined;
    iconURL: string | undefined;
    text: string;
}

export interface MessageEmbedImage {
    height: number | undefined;
    placeholder: string | undefined;
    placeholderVersion: number | undefined;
    proxyURL: string | undefined;
    url: string;
    width: number | undefined;
}

export interface MessageEmbedProvider {
    name: string;
    url: string | undefined;
}

/**
 * @todo
 * An embed thumbnail either
 * has `height`, `placeholder`, `placeholderVersion`, `proxyURL`, `url`, and `width`
 * or has only `height`, `url`, and `width`.
 */
export interface MessageEmbedThumbnail {
    height: number;
    placeholder: string | undefined;
    placeholderVersion: number | undefined;
    proxyURL: string | undefined;
    url: string;
    width: number;
}

// Original name: MessageEmbedTypes
export const enum MessageEmbedType {
    APPLICATION_NEWS = "application_news",
    ARTICLE = "article",
    AUTO_MODERATION_MESSAGE = "auto_moderation_message",
    AUTO_MODERATION_NOTIFICATION = "auto_moderation_notification",
    GAMING_PROFILE = "gaming_profile",
    GIFT = "gift",
    GIFV = "gifv",
    IMAGE = "image",
    LINK = "link",
    POLL_RESULT = "poll_result",
    POST_PREVIEW = "post_preview",
    RICH = "rich",
    SAFETY_POLICY_NOTICE = "safety_policy_notice",
    SAFETY_SYSTEM_NOTIFICATION = "safety_system_notification",
    TEXT = "text",
    TWEET = "tweet",
    VIDEO = "video",
    VOICE_CHANNEL = "voice_channel",
}

/**
 * @todo
 * An embed video must have either `proxyURL` or `url`, and having both is possible.
 * It might not be possible for an embed video to have `proxyURL` without `url`, though.
 */
export interface MessageEmbedVideo {
    height: number;
    placeholder: string | undefined;
    placeholderVersion: number | undefined;
    proxyURL: string | undefined;
    url: string | undefined;
    width: number;
}

export interface MessageEmbed {
    author?: MessageEmbedAuthor;
    color?: string;
    contentScanVersion: number | undefined;
    fields: MessageEmbedField[];
    flags: MessageEmbedFlags | undefined;
    footer?: MessageEmbedFooter;
    id: string;
    image?: MessageEmbedImage;
    provider?: MessageEmbedProvider;
    rawDescription: string | undefined;
    rawTitle: string | undefined;
    referenceId: string | undefined;
    thumbnail?: MessageEmbedThumbnail;
    timestamp?: Moment;
    type: MessageEmbedType | undefined;
    url: string | undefined;
    video?: MessageEmbedVideo;
}

export const enum MessageFlags {
    CROSSPOSTED = 1 << 0,
    IS_CROSSPOST = 1 << 1,
    SUPPRESS_EMBEDS = 1 << 2,
    SOURCE_MESSAGE_DELETED = 1 << 3,
    URGENT = 1 << 4,
    HAS_THREAD = 1 << 5,
    EPHEMERAL = 1 << 6,
    LOADING = 1 << 7,
    FAILED_TO_MENTION_SOME_ROLES_IN_THREAD = 1 << 8,
    SHOULD_SHOW_LINK_NOT_DISCORD_WARNING = 1 << 10,
    SUPPRESS_NOTIFICATIONS = 1 << 12,
    IS_VOICE_MESSAGE = 1 << 13,
    HAS_SNAPSHOT = 1 << 14,
    IS_UIKIT_COMPONENTS = 1 << 15,
}

export interface MessageGiftInfo {
    emoji?: string | null; // TEMP
    sound?: string | null; // TEMP
} // TEMP

export const enum InteractionTypes {
    PING = 1,
    APPLICATION_COMMAND = 2,
    MESSAGE_COMPONENT = 3,
    APPLICATION_COMMAND_AUTOCOMPLETE = 4,
    MODAL_SUBMIT = 5,
}

export class InteractionRecord extends ImmutableRecord {
    constructor(interaction: Record<string, any>); // TEMP

    static createFromServer(interactionFromServer: Record<string, any>): InteractionRecord; // TEMP

    displayName: string;
    id: string;
    name: string;
    type: InteractionTypes;
    user: UserRecord;
}

export interface InteractionData {
    application_command: any; // TEMP
    guild_id: any; // TEMP
    id: any; // TEMP
    name: any; // TEMP
    options: any; // TEMP
    type: any; // TEMP
    version: any; // TEMP
} // TEMP

export interface InteractionMetadata {
    authorizing_integration_owners: Partial<Record<ApplicationIntegrationType, string>>;
    id: string;
    interacted_message_id?: string;
    original_response_message_id?: string;
    triggering_interaction_metadata?: InteractionMetadata;
    type: InteractionTypes;
    /** @todo This is not a UserRecord; it's a user object from the API. */
    user: Record<string, any>;
} // TEMP

export interface ChannelMention {
    guild_id: string;
    id: string;
    name: string;
    type: ChannelType;
}

export interface MessageReference {
    channel_id: string;
    guild_id?: string;
    message_id?: string;
}

export const enum PollLayoutTypes {
    UNKNOWN = 0,
    DEFAULT = 1,
    IMAGE_ONLY_ANSWERS = 2,
}

export interface MessageEmoji {
    animated?: boolean;
    id: string | null;
    name: string | null;
}

export interface MessagePollMedia {
    emoji?: MessageEmoji;
    text?: string;
}

export interface MessagePollAnswer {
    answer_id: number;
    poll_media: MessagePollMedia;
}

export interface MessagePollAnswerCount {
    count: number;
    id: number;
    me_voted: boolean;
}

export interface MessagePollResults {
    answer_counts: MessagePollAnswerCount[];
    is_finalized: boolean;
}

export interface MessagePoll {
    allow_multiselect: boolean;
    answers: MessagePollAnswer[];
    expiry: Moment;
    layout_type: PollLayoutTypes;
    question: MessagePollMedia;
    results?: MessagePollResults;
}

export const enum PurchaseNotificationType {
    GUILD_PRODUCT = 0,
}

export interface MessagePurchaseNotification {
    guild_product_purchase: {
        listing_id?: string | null; // TEMP
        product_name?: string | null; // TEMP
    }; // TEMP
    type: PurchaseNotificationType;
} // TEMP

export interface MessageReactionCountDetails {
    burst: number;
    normal: number;
    vote?: number;
}

export interface MessageReaction {
    burst_colors: string[];
    burst_count: number;
    count: number;
    count_details: MessageReactionCountDetails;
    emoji: MessageEmoji;
    me: boolean;
    me_burst: boolean;
    me_vote?: boolean;
}

export interface MessageRoleSubscriptionData {
    is_renewal?: boolean | null; // TEMP
    role_subscription_listing_id?: string | null; // TEMP
    tier_name?: string | null; // TEMP
    total_months_subscribed?: number | null; // TEMP
} // TEMP

export const enum MessageStates {
    SEND_FAILED = "SEND_FAILED",
    SENDING = "SENDING",
    SENT = "SENT",
}

export const enum StickerFormat {
    PNG = 1,
    APNG = 2,
    LOTTIE = 3,
    GIF = 4,
}

export interface MessageStickerItem {
    format_type: StickerFormat;
    id: string;
    name: string;
}

export const enum MetaStickerType {
    STANDARD = 1,
    GUILD = 2,
}

export interface MessageSticker {
    asset?: "";
    available?: boolean;
    description: string | null;
    format_type: StickerFormat;
    guild_id?: string;
    id: string;
    name: string;
    pack_id?: string;
    sort_value?: number;
    tags: string;
    type: MetaStickerType;
    /** @todo This is not a UserRecord; it's a user object from the API. */
    user?: Record<string, any>;
}

export const enum MessageTypes {
    DEFAULT = 0,
    RECIPIENT_ADD = 1,
    RECIPIENT_REMOVE = 2,
    CALL = 3,
    CHANNEL_NAME_CHANGE = 4,
    CHANNEL_ICON_CHANGE = 5,
    CHANNEL_PINNED_MESSAGE = 6,
    USER_JOIN = 7,
    GUILD_BOOST = 8,
    GUILD_BOOST_TIER_1 = 9,
    GUILD_BOOST_TIER_2 = 10,
    GUILD_BOOST_TIER_3 = 11,
    CHANNEL_FOLLOW_ADD = 12,
    GUILD_STREAM = 13,
    GUILD_DISCOVERY_DISQUALIFIED = 14,
    GUILD_DISCOVERY_REQUALIFIED = 15,
    GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING = 16,
    GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING = 17,
    THREAD_CREATED = 18,
    REPLY = 19,
    CHAT_INPUT_COMMAND = 20,
    THREAD_STARTER_MESSAGE = 21,
    GUILD_INVITE_REMINDER = 22,
    CONTEXT_MENU_COMMAND = 23,
    AUTO_MODERATION_ACTION = 24,
    ROLE_SUBSCRIPTION_PURCHASE = 25,
    INTERACTION_PREMIUM_UPSELL = 26,
    STAGE_START = 27,
    STAGE_END = 28,
    STAGE_SPEAKER = 29,
    STAGE_RAISE_HAND = 30,
    STAGE_TOPIC = 31,
    GUILD_APPLICATION_PREMIUM_SUBSCRIPTION = 32,
    PRIVATE_CHANNEL_INTEGRATION_ADDED = 33,
    PRIVATE_CHANNEL_INTEGRATION_REMOVED = 34,
    PREMIUM_REFERRAL = 35,
    GUILD_INCIDENT_ALERT_MODE_ENABLED = 36,
    GUILD_INCIDENT_ALERT_MODE_DISABLED = 37,
    GUILD_INCIDENT_REPORT_RAID = 38,
    GUILD_INCIDENT_REPORT_FALSE_ALARM = 39,
    GUILD_DEADCHAT_REVIVE_PROMPT = 40,
    CUSTOM_GIFT = 41,
    GUILD_GAMING_STATS_PROMPT = 42,
    PURCHASE_NOTIFICATION = 44,
    VOICE_HANGOUT_INVITE = 45,
    POLL_RESULT = 46,
    CHANGELOG = 47,
}
