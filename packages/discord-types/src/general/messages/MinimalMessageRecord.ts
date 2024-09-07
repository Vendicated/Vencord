/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Moment } from "moment";

import type { Nullish, Optional, SnakeCasedProperties } from "../../internal";
import type { ChannelType } from "../channels/ChannelRecord";
import type { RecordBase } from "../Record";

export type MinimalMessageRecordOwnProperties = Pick<MinimalMessageRecord, "attachments" | "codedLinks" | "components" | "content" | "editedTimestamp" | "embeds" | "flags" | "stickerItems" | "stickers" | "timestamp" | "type">;

export type MinimalMessageProperties = Optional<MinimalMessageRecordOwnProperties, Nullish>
    & SnakeCasedProperties<Optional<Pick<MinimalMessageRecordOwnProperties, "stickerItems">, Nullish>>;

export declare class MinimalMessageRecord<
    OwnProperties extends MinimalMessageRecordOwnProperties = MinimalMessageRecordOwnProperties
> extends RecordBase<OwnProperties> {
    constructor(minimalMessageProperties: MinimalMessageProperties);

    attachments: MessageAttachment[];
    codedLinks: CodedLink[];
    components: MessageComponent[];
    content: string;
    editedTimestamp: Date | null;
    embeds: MessageEmbed[];
    flags: MessageFlags;
    stickerItems: StickerItem[];
    stickers: Sticker[];
    timestamp: Date;
    type: MessageType;
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

export enum MessageAttachmentFlags {
    IS_CLIP = 1 << 0,
    IS_THUMBNAIL = 1 << 1,
    IS_REMIX = 1 << 2,
    IS_SPOILER = 1 << 3,
    CONTAINS_EXPLICIT_MEDIA = 1 << 4,
}

export interface CodedLink {
    code: string;
    type: CodedLinkType;
}

export enum CodedLinkType {
    ACTIVITY_BOOKMARK = "ACTIVITY_BOOKMARK",
    APP_DIRECTORY_PROFILE = "APP_DIRECTORY_PROFILE",
    APP_DIRECTORY_STOREFRONT = "APP_DIRECTORY_STOREFRONT",
    APP_DIRECTORY_STOREFRONT_SKU = "APP_DIRECTORY_STOREFRONT_SKU",
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

export type MessageComponent = MessageActionRowComponent | MessageButtonComponent | MessageSelectComponent | MessageTextInputComponent | MessageTextComponent | MessageMediaGalleryComponent | MessageSeparatorComponent | MessageContentInventoryEntryComponent;

export interface MessageComponentBase {
    id: string;
    type: MessageComponentType;
}

export interface MessageActionRowComponent extends MessageComponentBase {
    components: Exclude<MessageComponent, MessageActionRowComponent>[];
    type: MessageComponentType.ACTION_ROW;
}

export type MessageButtonComponent = MessageNonLinkButtonComponent | MessageLinkButtonComponent;

export interface MessageButtonComponentBase extends MessageComponentBase {
    customId: string | undefined;
    disabled: boolean | undefined;
    emoji: MessageComponentEmoji | undefined;
    label: string | undefined;
    style: MessageButtonComponentStyle;
    type: MessageComponentType.BUTTON;
    url: string | undefined;
}

export interface MessageNonLinkButtonComponent extends MessageButtonComponentBase {
    customId: string;
    style: Exclude<MessageButtonComponentStyle, MessageButtonComponentStyle.LINK>;
    url: undefined;
}

export interface MessageLinkButtonComponent extends MessageButtonComponentBase {
    customId: undefined;
    style: MessageButtonComponentStyle.LINK;
    url: string;
}

// Original name: ButtonStyle
export enum MessageButtonComponentStyle {
    PRIMARY = 1,
    SECONDARY = 2,
    SUCCESS = 3,
    DESTRUCTIVE = 4,
    LINK = 5,
    PREMIUM = 6,
}

export type MessageSelectComponent = MessageStringSelectComponent | MessageSnowflakeSelectComponent;

export interface MessageSelectComponentBase extends MessageComponentBase {
    customId: string;
    disabled: boolean | undefined;
    maxValues: number | undefined;
    minValues: number | undefined;
    placeholder: string;
    type: MessageComponentType.STRING_SELECT | MessageComponentType.USER_SELECT | MessageComponentType.ROLE_SELECT | MessageComponentType.MENTIONABLE_SELECT | MessageComponentType.CHANNEL_SELECT;
}

export interface MessageStringSelectComponent extends MessageSelectComponentBase {
    options: MessageSelectComponentMenuOption<MessageSelectComponentOptionType.STRING>[];
    type: MessageComponentType.STRING_SELECT;
}

export interface MessageSelectComponentMenuOption<
    OptionType extends MessageSelectComponentOptionType = MessageSelectComponentOptionType
> {
    default: boolean | undefined;
    description: string | undefined;
    emoji: MessageComponentEmoji | undefined;
    label: string;
    type: OptionType;
    value: string;
}

// Original name: SelectOptionType
export enum MessageSelectComponentOptionType {
    STRING = 1,
    USER = 2,
    ROLE = 3,
    CHANNEL = 4,
    GUILD = 5,
}

export type MessageSnowflakeSelectComponent = MessageUserSelectComponent | MessageRoleSelectComponent | MessageMentionableSelectComponent | MessageChannelSelectComponent;

export interface MessageSnowflakeSelectComponentBase extends MessageSelectComponentBase {
    defaultValues: MessageSelectComponentDefaultValue[];
    type: MessageComponentType.USER_SELECT | MessageComponentType.ROLE_SELECT | MessageComponentType.MENTIONABLE_SELECT | MessageComponentType.CHANNEL_SELECT;
}

export interface MessageUserSelectComponent extends MessageSnowflakeSelectComponentBase {
    defaultValues: MessageSelectComponentDefaultValue<MessageSelectComponentDefaultValueType.USER>[];
    type: MessageComponentType.USER_SELECT;
}

export interface MessageRoleSelectComponent extends MessageSnowflakeSelectComponentBase {
    defaultValues: MessageSelectComponentDefaultValue<MessageSelectComponentDefaultValueType.ROLE>[];
    type: MessageComponentType.ROLE_SELECT;
}

export interface MessageMentionableSelectComponent extends MessageSnowflakeSelectComponentBase {
    defaultValues: MessageSelectComponentDefaultValue<MessageSelectComponentDefaultValueType.ROLE | MessageSelectComponentDefaultValueType.USER>[];
    type: MessageComponentType.MENTIONABLE_SELECT;
}

export interface MessageChannelSelectComponent extends MessageSnowflakeSelectComponentBase {
    channelTypes: ChannelType[] | undefined;
    defaultValues: MessageSelectComponentDefaultValue<MessageSelectComponentDefaultValueType.CHANNEL>[];
    type: MessageComponentType.CHANNEL_SELECT;
}

export interface MessageSelectComponentDefaultValue<
    DefaultValueType extends MessageSelectComponentDefaultValueType = MessageSelectComponentDefaultValueType
> {
    id: string;
    type: DefaultValueType;
}

// Original name: SnowflakeSelectDefaultValueTypes
export enum MessageSelectComponentDefaultValueType {
    CHANNEL = "channel",
    ROLE = "role",
    USER = "user",
}

export interface MessageTextInputComponent extends MessageComponentBase {
    customId: string;
    disabled: boolean | undefined;
    label: string;
    maxLength: number | undefined;
    minLength: number | undefined;
    placeholder: string | undefined;
    required: boolean;
    style: MessageTextInputComponentStyle;
    type: MessageComponentType.INPUT_TEXT;
    value: string | undefined;
}

// Original name: TextComponentStyle
export enum MessageTextInputComponentStyle {
    SMALL = 1,
    PARAGRAPH = 2,
}

export interface MessageTextComponent extends MessageComponentBase {
    /** @todo May not be undefined. */
    content: string | undefined;
    type: MessageComponentType.TEXT;
}

export interface MessageMediaGalleryComponent extends MessageComponentBase {
    items: {
        /** @todo May not be undefined. */
        description: string | undefined;
        media: MessageMediaGalleryComponentItem;
        /** @todo May not be undefined. */
        spoiler: boolean | undefined;
    }[];
    type: MessageComponentType.MEDIA_GALLERY;
}
export interface MessageMediaGalleryComponentItem {
    contentScanMetadata: {
        contentScanFlags: ContentScanFlags;
        /** @todo May not be undefined. */
        version: number | undefined;
    } | undefined;
    contentType: string;
    height: number;
    placeholder: string | undefined;
    /** @todo May not be undefined. */
    placeholderVersion: number | undefined;
    proxyUrl: string;
    url: string;
    width: number;
}

export enum ContentScanFlags {
    EXPLICIT = 1,
}

export interface MessageSeparatorComponent extends MessageComponentBase {
    divider: boolean;
    spacing: SeparatorSpacingSize;
    type: MessageComponentType.SEPARATOR;
}

export enum SeparatorSpacingSize {
    SMALL = 1,
    LARGE = 2,
}

export interface MessageContentInventoryEntryComponent extends MessageComponentBase {
    /** @todo */
    contentInventoryEntry: Record<string, any>;
    type: MessageComponentType.CONTENT_INVENTORY_ENTRY;
}

export type MessageComponentEmoji = MessageComponentUnicodeEmoji | MessageComponentGuildEmoji;

export interface MessageComponentUnicodeEmoji {
    animated: false | undefined;
    id: undefined;
    name: string;
    src: undefined;
}

export interface MessageComponentGuildEmoji {
    animated: boolean | undefined;
    id: string;
    name: string;
    src: string | undefined;
}

// Original name: ComponentType
// Renamed to avoid name conflicts with ComponentType from React.
export enum MessageComponentType {
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
    CONTENT_INVENTORY_ENTRY = 16,
}

export type MessageEmbed = {
    author?: MessageEmbedAuthor;
    color?: string;
    /** @todo May not be undefined. */
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
} & ({} | {
    provider: MessageEmbedProvider;
    thumbnail: MessageEmbedThumbnail;
    video: MessageEmbedVideo;
});

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

export enum MessageEmbedFlags {
    CONTAINS_EXPLICIT_MEDIA = 1 << 4,
    IS_CONTENT_INVENTORY_ENTRY = 1 << 5,
}

export interface MessageEmbedFooter {
    iconProxyURL: string | undefined;
    iconURL: string | undefined;
    text: string;
}

export interface MessageEmbedImage {
    /** Always greater than 0. */
    height: number;
    placeholder: string | undefined;
    placeholderVersion: number | undefined;
    proxyURL: string | undefined;
    url: string;
    /** Always greater than 0. */
    width: number;
}

export interface MessageEmbedProvider {
    name: string;
    url: string | undefined;
}

export type MessageEmbedThumbnail = {
    /** Always greater than 0. */
    height: number;
    url: string;
    /** Always greater than 0. */
    width: number;
} & ({} | {
    placeholder: string | undefined;
    placeholderVersion: number | undefined;
    proxyURL: string | undefined;
});

// Original name: MessageEmbedTypes
export enum MessageEmbedType {
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

export type MessageEmbedVideo = {
    /** Always greater than 0. */
    height: number;
    placeholder: string | undefined;
    placeholderVersion: number | undefined;
    /** Always greater than 0. */
    width: number;
} & ({
    proxyURL: string;
    url: string | undefined;
} | {
    proxyURL: string | undefined;
    url: string;
});

export enum MessageFlags {
    CROSSPOSTED = 1 << 0,
    IS_CROSSPOST = 1 << 1,
    SUPPRESS_EMBEDS = 1 << 2,
    SOURCE_MESSAGE_DELETED = 1 << 3,
    URGENT = 1 << 4,
    HAS_THREAD = 1 << 5,
    EPHEMERAL = 1 << 6,
    LOADING = 1 << 7,
    FAILED_TO_MENTION_SOME_ROLES_IN_THREAD = 1 << 8,
    GUILD_FEED_HIDDEN = 1 << 9,
    SHOULD_SHOW_LINK_NOT_DISCORD_WARNING = 1 << 10,
    SUPPRESS_NOTIFICATIONS = 1 << 12,
    IS_VOICE_MESSAGE = 1 << 13,
    HAS_SNAPSHOT = 1 << 14,
    IS_UIKIT_COMPONENTS = 1 << 15,
}

export interface StickerItem {
    format_type: StickerFormat;
    id: string;
    name: string;
}

export enum StickerFormat {
    PNG = 1,
    APNG = 2,
    LOTTIE = 3,
    GIF = 4,
}

export type Sticker = StandardSticker | GuildSticker;

export interface StickerBase {
    asset?: "";
    description: string | null;
    format_type: StickerFormat;
    id: string;
    name: string;
    tags: string;
    type: MetaStickerType;
}

export interface StandardSticker extends StickerBase {
    pack_id: string;
    sort_value: number;
}

export interface GuildSticker extends StickerBase {
    /** @todo May actually not be optional. */
    available?: boolean;
    guild_id: string;
    /** @todo This is not a UserRecord; it is a user object from the API. */
    user: Record<string, any>;
}

export enum MetaStickerType {
    STANDARD = 1,
    GUILD = 2,
}

// Original name: MessageTypes
export enum MessageType {
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
    NITRO_NOTIFICATION = 48,
    CHANNEL_LINKED_TO_LOBBY = 49,
}
