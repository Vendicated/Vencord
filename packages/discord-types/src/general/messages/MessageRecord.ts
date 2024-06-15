/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Duration, Moment } from "moment";
import type { ReactNode } from "react";
import type { SnakeCasedProperties } from "type-fest";

import type { Nullish, Optional } from "../../internal";
import type { ApplicationCommand, ApplicationCommandType } from "../ApplicationCommand";
import type { ApplicationIntegrationType } from "../ApplicationRecord";
import type { ChannelRecord, ChannelType } from "../channels/ChannelRecord";
import type { UserRecord } from "../UserRecord";
import type { InteractionRecord, InteractionType } from "./InteractionRecord";
import type { MessageSnapshotRecord } from "./MessageSnapshotRecord";
import type { MessageFlags, MinimalMessageRecord, MinimalMessageRecordOwnProperties } from "./MinimalMessageRecord";

export type MessageRecordOwnProperties = MinimalMessageRecordOwnProperties & Pick<MessageRecord, "activity" | "activityInstance" | "application" | "applicationId" | "author" | "blocked" | "bot" | "call" | "changelogId" | "codedLinks" | "colorString" | "customRenderedContent" | "giftCodes" | "giftInfo" | "id" | "interaction" | "interactionData" | "interactionError" | "interactionMetadata" | "isSearchHit" | "isUnsupported" | "loggingName" | "mentionChannels" | "mentionEveryone" | "mentionRoles" | "mentioned" | "mentions" | "messageReference" | "messageSnapshots" | "nick" | "nonce" | "pinned" | "poll" | "purchaseNotification" | "reactions" | "referralTrialOfferId" | "roleSubscriptionData" | "state" | "stickerItems" | "stickers" | "tts" | "webhookId">;

export type MessageProperties = Optional<MessageRecordOwnProperties, Nullish, "author" | "channel_id" | "id" | "customRenderedContent" | "colorString" | "giftInfo" | "nick" | "roleSubscriptionData" | "purchaseNotification" | "poll", true>
    & SnakeCasedProperties<Optional<Pick<MessageRecordOwnProperties, "applicationId" | "activityInstance" | "giftInfo" | "stickerItems" | "changelogId">, Nullish>>
    & Partial<Pick<MessageRecordOwnProperties, "giftInfo">>;

export declare class MessageRecord<
    OwnProperties extends MessageRecordOwnProperties = MessageRecordOwnProperties
> extends MinimalMessageRecord<OwnProperties> {
    constructor(messageProperties: MessageProperties);

    addReaction(
        emoji: MessageReactionEmoji,
        me?: boolean | undefined /* = false */,
        burstColors?: string[] | undefined /* = [] */,
        type?: ReactionType | undefined /* = ReactionType.NORMAL */
    ): this;
    addReactionBatch(reactions: { emoji: MessageReactionEmoji; users: string[]; }, meId: string): this;
    canDeleteOwnMessage(userId: string): boolean;
    getChannelId(): string;
    getReaction(emoji: MessageReactionEmoji): MessageReaction | undefined;
    hasFlag(flag: MessageFlags): boolean;
    isCommandType(): boolean;
    isEdited(): boolean;
    isFirstMessageInForumPost(channel: ChannelRecord): boolean;
    isInteractionPlaceholder(): boolean;
    isPoll(): boolean;
    isSystemDM(): boolean;
    isUIKitComponents(): boolean;
    removeReaction(
        emoji: MessageReactionEmoji,
        me?: boolean | undefined /* = false */,
        type?: ReactionType | undefined /* = ReactionType.NORMAL */
    ): this;
    removeReactionsForEmoji(emoji: MessageReactionEmoji): this;
    toJS(): OwnProperties & SnakeCasedProperties<Pick<OwnProperties, "editedTimestamp" | "mentionEveryone" | "webhookId">>;
    userHasReactedWithEmoji(emoji: MessageReactionEmoji, burst?: boolean | undefined /* = false */): boolean;

    activity: MessageActivity | null;
    activityInstance: { id: string; } | null;
    /** @todo This is not an ApplicationRecord; it's an application object from the API. */
    application: Record<string, any> | null;
    applicationId: string | null;
    author: UserRecord;
    blocked: boolean;
    bot: boolean;
    call: MessageCall | null;
    changelogId: string | null;
    codedLinks: CodedLink[];
    colorString: string | undefined;
    customRenderedContent: MessageCustomRenderedContent | Nullish;
    giftCodes: string[];
    giftInfo: MessageGiftInfo | undefined;
    id: string;
    interaction: InteractionRecord | null;
    interactionData: MessageInteractionData | null;
    interactionError: string | null;
    interactionMetadata: MessageInteractionMetadata | null;
    isSearchHit: boolean;
    isUnsupported: boolean;
    loggingName: string | null;
    mentionChannels: ChannelMention[];
    mentioned: boolean;
    mentionEveryone: boolean;
    mentionRoles: string[];
    mentions: string[];
    /** Only present for MessageRecords with type MessageType.REPLY or MessageType.THREAD_STARTER_MESSAGE. */
    messageReference: MessageReference | null;
    messageSnapshots: MessageSnapshotRecord[];
    nick: string | undefined;
    nonce: string | number | null;
    pinned: boolean;
    poll: MessagePoll | undefined;
    purchaseNotification: MessagePurchaseNotification | undefined;
    reactions: MessageReaction[];
    referralTrialOfferId: string | null;
    roleSubscriptionData: MessageRoleSubscriptionData | undefined;
    state: MessageStates;
    stickerItems: StickerItem[];
    stickers: Sticker[];
    tts: boolean;
    webhookId: string | null;
}

export interface MessageActivity {
    party_id?: string;
    type: ActivityActionType;
}

// Original name: ActivityActionTypes
export enum ActivityActionType {
    JOIN = 1,
    SPECTATE = 2,
    LISTEN = 3,
    WATCH = 4,
    JOIN_REQUEST = 5,
}

export interface MessageCall {
    duration: Duration | null;
    endedTimestamp: Moment | null;
    participants: string[];
}

export interface CodedLink {
    code: string;
    type: CodedLinkType;
}

export enum CodedLinkType {
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

export interface MessageCustomRenderedContent {
    content: ReactNode;
    hasSpoilerEmbeds: boolean;
}

/** @todo Some properties may either not be nullable or not be optional. */
export interface MessageGiftInfo {
    emoji?: MessageReactionEmoji | null;
    /** @todo May have more properties. */
    sound?: { id: string; } | null;
}

export interface MessageInteractionData extends Pick<ApplicationCommand<ApplicationCommandType.CHAT>, "id" | "name" | "options" | "type"> {
    /** @todo May not be nullable or optional. */
    application_command?: ApplicationCommand<ApplicationCommandType.CHAT> | null;
}

export interface MessageInteractionMetadata {
    authorizing_integration_owners: Partial<Record<ApplicationIntegrationType, string>>;
    id: string;
    interacted_message_id?: string;
    original_response_message_id?: string;
    triggering_interaction_metadata?: MessageInteractionMetadata;
    type: InteractionType;
    /** @todo This is not a UserRecord; it's a user object from the API. */
    user: Record<string, any>;
}

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

export interface MessagePoll {
    allow_multiselect: boolean;
    answers: MessagePollAnswer[];
    expiry: Moment;
    layout_type: PollLayoutType;
    question: MessagePollMedia;
    results?: MessagePollResults;
}

export interface MessagePollAnswer {
    answer_id: number;
    poll_media: MessagePollMedia;
}

// Original name: PollLayoutTypes
export enum PollLayoutType {
    UNKNOWN = 0,
    DEFAULT = 1,
    IMAGE_ONLY_ANSWERS = 2,
}

export interface MessagePollMedia {
    emoji?: MessageReactionEmoji;
    text?: string;
}

export interface MessagePollResults {
    answer_counts: MessagePollAnswerCount[];
    is_finalized: boolean;
}

export interface MessagePollAnswerCount {
    count: number;
    id: number;
    me_voted: boolean;
}

/** @todo May have more properties. Some properties may either not be nullable or not be optional. */
export interface MessagePurchaseNotification {
    guild_product_purchase?: {
        listing_id?: string | null;
        product_name?: string | null;
    } | null;
    type: PurchaseNotificationType;
}

export enum PurchaseNotificationType {
    GUILD_PRODUCT = 0,
}

export type MessageReaction = MessageNonVoteReaction | MessageVoteReaction;

export interface MessageReactionBase {
    burst_count: number;
    count: number;
    count_details: MessageReactionCountDetails;
    emoji: MessageReactionEmoji;
    me: boolean;
    me_burst: boolean;
}

export interface MessageNonVoteReaction extends MessageReactionBase {
    burst_colors: string[];
    burst_me?: boolean;
    count_details: MessageNonVoteReactionCountDetails;
}

export interface MessageVoteReaction extends MessageReactionBase {
    count_details: MessageVoteReactionCountDetails;
    me_vote: boolean;
}

export type MessageReactionEmoji = MessageReactionUnicodeEmoji | MessageReactionGuildEmoji;

export interface MessageReactionUnicodeEmoji {
    animated?: false;
    id?: null;
    name: string;
}

export interface MessageReactionGuildEmoji {
    animated?: boolean;
    id: string;
    name: string;
}

export type MessageReactionCountDetails = MessageNonVoteReactionCountDetails | MessageVoteReactionCountDetails;

export interface MessageNonVoteReactionCountDetails {
    burst: number;
    normal: number;
}

export interface MessageVoteReactionCountDetails {
    vote: number;
}

// Original name: ReactionTypes
export enum ReactionType {
    NORMAL = 0,
    BURST = 1,
    VOTE = 2,
}

export interface MessageRoleSubscriptionData {
    is_renewal: boolean;
    role_subscription_listing_id: string;
    tier_name: string;
    total_months_subscribed: number;
}

export enum MessageStates {
    SEND_FAILED = "SEND_FAILED",
    SENDING = "SENDING",
    SENT = "SENT",
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
    /** @todo This is not a UserRecord; it's a user object from the API. */
    user: Record<string, any>;
}

export enum MetaStickerType {
    STANDARD = 1,
    GUILD = 2,
}
