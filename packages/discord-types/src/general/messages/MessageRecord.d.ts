/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Duration, Moment } from "moment";
import type { ReactNode } from "react";
import type { SnakeCasedProperties } from "type-fest";

import type { Nullish, Optional } from "../../internal";
import type { ApplicationIntegrationType } from "../ApplicationRecord";
import type { ChannelRecord, ChannelType } from "../channels/ChannelRecord";
import type { ImmutableRecord } from "../ImmutableRecord";
import type { UserRecord } from "../UserRecord";
import type { MessageSnapshotRecord } from "./MessageSnapshotRecord";
import type { MessageFlags, MinimalMessageRecord, MinimalMessageRecordOwnProperties } from "./MinimalMessageRecord";

export type MessageRecordOwnProperties = MinimalMessageRecordOwnProperties & Pick<MessageRecord, "activity" | "activityInstance" | "application" | "applicationId" | "author" | "blocked" | "bot" | "call" | "changelogId" | "codedLinks" | "colorString" | "customRenderedContent" | "giftCodes" | "giftInfo" | "id" | "interaction" | "interactionData" | "interactionError" | "interactionMetadata" | "isSearchHit" | "isUnsupported" | "loggingName" | "mentionChannels" | "mentionEveryone" | "mentionRoles" | "mentioned" | "mentions" | "messageReference" | "messageSnapshots" | "nick" | "nonce" | "pinned" | "poll" | "purchaseNotification" | "reactions" | "referralTrialOfferId" | "roleSubscriptionData" | "state" | "stickerItems" | "stickers" | "tts" | "webhookId">;

export type MessageProperties = Optional<MessageRecordOwnProperties, Nullish, "author" | "channel_id" | "id" | "customRenderedContent" | "colorString" | "giftInfo" | "nick" | "roleSubscriptionData" | "purchaseNotification" | "poll", true>
    & SnakeCasedProperties<Optional<Pick<MessageRecordOwnProperties, "applicationId" | "activityInstance" | "stickerItems" | "changelogId">, Nullish>>
    & ({ gift_info?: MessageRecordOwnProperties["giftInfo"] | Nullish; giftInfo: MessageRecordOwnProperties["giftInfo"]; }
    | { gift_info: MessageRecordOwnProperties["giftInfo"]; giftInfo?: MessageRecordOwnProperties["giftInfo"] | Nullish; });

export class MessageRecord<
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
    interactionData: InteractionData | null;
    interactionError: string | null;
    interactionMetadata: InteractionMetadata | null;
    isSearchHit: boolean;
    isUnsupported: boolean;
    loggingName: string | null;
    mentionChannels: ChannelMention[];
    mentioned: boolean;
    mentionEveryone: boolean;
    mentionRoles: string[];
    mentions: string[];
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
    stickerItems: MessageStickerItem[];
    stickers: MessageSticker[];
    tts: boolean;
    webhookId: string | null;
}

export interface MessageActivity {
    party_id?: string;
    type: ActivityActionType;
}

// Original name: ActivityActionTypes
export const enum ActivityActionType {
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

export interface MessageCustomRenderedContent {
    content: ReactNode;
    hasSpoilerEmbeds: boolean;
}

export interface MessageGiftInfo {
    emoji?: string | null; // TEMP
    sound?: string | null; // TEMP
} // TEMP

export class InteractionRecord extends ImmutableRecord {
    constructor(interaction: Record<string, any>); // TEMP

    static createFromServer(interactionFromServer: Record<string, any>): InteractionRecord; // TEMP

    displayName: string;
    id: string;
    name: string;
    type: InteractionType;
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
    type: InteractionType;
    /** @todo This is not a UserRecord; it's a user object from the API. */
    user: Record<string, any>;
} // TEMP

// Original name: InteractionTypes
export const enum InteractionType {
    PING = 1,
    APPLICATION_COMMAND = 2,
    MESSAGE_COMPONENT = 3,
    APPLICATION_COMMAND_AUTOCOMPLETE = 4,
    MODAL_SUBMIT = 5,
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

// Original name: PollLayoutTypes
export const enum PollLayoutType {
    UNKNOWN = 0,
    DEFAULT = 1,
    IMAGE_ONLY_ANSWERS = 2,
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

export interface MessagePurchaseNotification {
    guild_product_purchase: {
        listing_id?: string | null; // TEMP
        product_name?: string | null; // TEMP
    }; // TEMP
    type: PurchaseNotificationType;
} // TEMP

export const enum PurchaseNotificationType {
    GUILD_PRODUCT = 0,
}

export interface MessageReaction {
    burst_colors: string[];
    burst_count: number;
    count: number;
    count_details: MessageReactionCountDetails;
    emoji: MessageReactionEmoji;
    me: boolean;
    me_burst: boolean;
    me_vote?: boolean;
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

export interface MessageReactionCountDetails {
    burst: number;
    normal: number;
    vote?: number;
}

// Original name: ReactionTypes
export const enum ReactionType {
    NORMAL = 0,
    BURST = 1,
    VOTE = 2,
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

export interface MessageStickerItem {
    format_type: StickerFormat;
    id: string;
    name: string;
}

export const enum StickerFormat {
    PNG = 1,
    APNG = 2,
    LOTTIE = 3,
    GIF = 4,
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

export const enum MetaStickerType {
    STANDARD = 1,
    GUILD = 2,
}
