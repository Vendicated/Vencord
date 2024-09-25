/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish, Optional, SnakeCasedProperties } from "../../internal";
import type { PermissionOverwriteMap } from "../Permissions";
import type { AvatarDecorationData, UserClanData, UserFlags } from "../UserRecord";
import type { ForumChannelRecord } from "./ForumChannelRecord";
import type { GuildCategoryChannelRecord, GuildDirectoryChannelRecord, GuildTextualChannelRecord } from "./GuildTextualChannelRecord";
import type { GuildStageVoiceChannelRecord, GuildVocalChannelRecord, GuildVoiceChannelRecord } from "./GuildVocalChannelRecord";
import type { DMChannelRecord, GroupDMChannelRecord, PrivateChannelRecord } from "./PrivateChannelRecord";
import type { ThreadChannelRecord } from "./ThreadChannelRecord";

export type ChannelRecord = GuildChannelRecord | PrivateChannelRecord | ThreadChannelRecord;

export type GuildChannelRecord = GuildTextualChannelRecord | GuildVocalChannelRecord | ForumChannelRecord;

export type GuildSelectableChannelRecord = Exclude<GuildChannelRecord, GuildCategoryChannelRecord | GuildVocalChannelRecord>;

type ChannelRecordOwnPropertyKeys = "application_id" | "appliedTags" | "availableTags" | "bitrate_" | "blockedUserWarningDismissed" | "defaultAutoArchiveDuration" | "defaultForumLayout" | "defaultReactionEmoji" | "defaultSortOrder" | "defaultThreadRateLimitPerUser" | "flags_" | "guild_id" | "icon" | "iconEmoji" | "id" | "isMessageRequest" | "isMessageRequestTimestamp" | "isSpam" | "lastMessageId" | "lastPinTimestamp" | "linkedLobby" | "member" | "memberCount" | "memberIdsPreview" | "memberListId" | "messageCount" | "name" | "nicks" | "nsfw_" | "originChannelId" | "ownerId" | "parentChannelThreadType" | "parent_id" | "permissionOverwrites_" | "position_" | "rateLimitPerUser_" | "rawRecipients" | "recipientFlags" | "recipients" | "rtcRegion" | "safetyWarnings" | "template" | "themeColor" | "threadMetadata" | "topic_" | "totalMessageSent" | "type" | "userLimit_" | "version" | "videoQualityMode";

export type ChannelRecordOwnProperties<Channel extends ChannelRecordBase> = Pick<Channel, ChannelRecordOwnPropertyKeys>;

export declare abstract class ChannelRecordBase extends ChannelRecordProperties {
    get accessPermissions(): /* Permissions */ bigint;
    get bitrate(): number;
    computeLurkerPermissionsAllowList(): /* Permissions */ bigint | undefined;
    get flags(): ChannelFlags;
    getApplicationId(): this["application_id"];
    getDefaultLayout(): ForumLayout;
    getDefaultSortOrder(): ThreadSortOrder;
    getGuildId(): this["guild_id"];
    hasFlag(flag: ChannelFlags): boolean;
    isActiveThread(): boolean;
    isAnnouncementThread(): this is ThreadChannelRecord<ChannelType.ANNOUNCEMENT_THREAD>;
    isArchivedLockedThread(): boolean;
    isArchivedThread(): boolean;
    isCategory(): this is GuildCategoryChannelRecord;
    isDirectory(): this is GuildDirectoryChannelRecord;
    isDM(): this is DMChannelRecord;
    isForumChannel(): this is ForumChannelRecord<ChannelType.GUILD_FORUM>;
    isForumLikeChannel(): this is ForumChannelRecord;
    isForumPost(): boolean;
    isGroupDM(): this is GroupDMChannelRecord;
    isGuildStageVoice(): this is GuildStageVoiceChannelRecord;
    isGuildVocal(): this is GuildVocalChannelRecord;
    isGuildVocalOrThread(): this is GuildVocalChannelRecord | ThreadChannelRecord<ChannelType.PUBLIC_THREAD | ChannelType.PRIVATE_THREAD>;
    isGuildVoice(): this is GuildVoiceChannelRecord;
    isListenModeCapable(): this is GuildStageVoiceChannelRecord;
    isLockedThread(): boolean;
    isManaged(): boolean;
    isMediaChannel(): this is ForumChannelRecord<ChannelType.GUILD_MEDIA>;
    isMediaPost(): boolean;
    /** This method is functionally the same as {@link isGroupDM}. */
    isMultiUserDM(): this is GroupDMChannelRecord;
    isNSFW(): boolean;
    isOwner(userId: string): boolean;
    isPrivate(): this is PrivateChannelRecord;
    isRoleSubscriptionTemplatePreviewChannel(): boolean;
    isScheduledForDeletion(): boolean;
    isSystemDM(): boolean;
    isThread(): this is ThreadChannelRecord;
    isVocal(): this is PrivateChannelRecord | GuildVocalChannelRecord | ThreadChannelRecord<ChannelType.PUBLIC_THREAD | ChannelType.PRIVATE_THREAD>;
    isVocalThread(): this is ThreadChannelRecord<ChannelType.PUBLIC_THREAD | ChannelType.PRIVATE_THREAD>;
    merge(collection: Partial<ChannelRecordOwnProperties<this>>): this;
    get nsfw(): boolean;
    get permissionOverwrites(): PermissionOverwriteMap;
    get position(): number;
    get rateLimitPerUser(): number;
    set<Key extends ChannelRecordOwnPropertyKeys>(key: Key, value: ChannelRecordOwnProperties<this>[Key]): this;
    toJS(): ChannelRecordOwnProperties<this>;
    get topic(): string;
    get userLimit(): number;
}

export type ChannelProperties = Optional<Pick<ChannelRecordOwnProperties<ChannelRecordBase>, "guild_id" | "id" | "name" | "type">, Nullish, "id", true>;

export declare abstract class ChannelRecordProperties {
    constructor(channelProperties: ChannelProperties);

    application_id?: string | undefined;
    appliedTags?: string[] | undefined;
    availableTags?: ForumTag[] | undefined;
    bitrate_?: number | undefined;
    blockedUserWarningDismissed?: boolean | undefined;
    defaultAutoArchiveDuration?: number | undefined;
    defaultForumLayout?: ForumLayout | undefined;
    defaultReactionEmoji?: ForumDefaultReactionEmoji | undefined;
    defaultSortOrder?: ThreadSortOrder | Nullish;
    defaultThreadRateLimitPerUser?: number | undefined;
    flags_: ChannelFlags | undefined;
    guild_id: string | null;
    icon?: string | Nullish;
    iconEmoji?: {
        id: string | null;
        name: string;
    } | undefined;
    id: string;
    isMessageRequest?: boolean | undefined;
    isMessageRequestTimestamp?: string | Nullish;
    isSpam?: boolean | undefined;
    lastMessageId: string | Nullish;
    lastPinTimestamp: string | Nullish;
    /** @todo May have more properties. */
    linkedLobby?: { application_id?: string | null; } & Record<string, any> | Nullish;
    member?: ThreadMember | undefined;
    memberCount?: number | undefined;
    memberIdsPreview?: string[] | undefined;
    memberListId?: string | Nullish;
    messageCount?: number | undefined;
    name: string;
    nicks?: { [userId: string]: string; } | undefined;
    nsfw_?: boolean | undefined;
    originChannelId?: string | Nullish;
    ownerId?: string | undefined;
    parent_id?: string | Nullish;
    parentChannelThreadType?: ChannelType.GUILD_TEXT | ChannelType.GUILD_ANNOUNCEMENT | ChannelType.GUILD_FORUM | ChannelType.GUILD_MEDIA | undefined;
    permissionOverwrites_?: PermissionOverwriteMap | undefined;
    position_?: number | undefined;
    rateLimitPerUser_?: number | undefined;
    rawRecipients?: ChannelRecipient[] | undefined;
    recipientFlags?: number | undefined;
    recipients?: string[] | undefined;
    rtcRegion?: string | Nullish;
    safetyWarnings?: SafetyWarning[] | undefined;
    template?: string | undefined;
    themeColor?: number | Nullish;
    threadMetadata?: ThreadMetadata | undefined;
    topic_?: string | Nullish;
    totalMessageSent?: number | undefined;
    type: ChannelType;
    userLimit_?: number | undefined;
    version?: number | undefined;
    videoQualityMode?: VideoQualityMode | undefined;
}

export interface ForumTag {
    emojiId: string | null;
    emojiName: string | null;
    id: string;
    moderated: boolean;
    name: string;
}

export enum ForumLayout {
    DEFAULT = 0,
    LIST = 1,
    GRID = 2,
}

export interface ForumDefaultReactionEmoji {
    emojiId: string | null;
    emojiName: string | null;
}

export enum ThreadSortOrder {
    LATEST_ACTIVITY = 0,
    CREATION_DATE = 1,
}

export enum ChannelFlags {
    GUILD_FEED_REMOVED = 1 << 0,
    PINNED = 1 << 1,
    ACTIVE_CHANNELS_REMOVED = 1 << 2,
    REQUIRE_TAG = 1 << 4,
    IS_SPAM = 1 << 5,
    IS_GUILD_RESOURCE_CHANNEL = 1 << 7,
    CLYDE_AI = 1 << 8,
    IS_SCHEDULED_FOR_DELETION = 1 << 9,
    IS_MEDIA_CHANNEL = 1 << 10,
    SUMMARIES_DISABLED = 1 << 11,
    IS_ROLE_SUBSCRIPTION_TEMPLATE_PREVIEW_CHANNEL = 1 << 13,
    IS_BROADCASTING = 1 << 14,
    HIDE_MEDIA_DOWNLOAD_OPTIONS = 1 << 15,
    IS_JOIN_REQUEST_INTERVIEW_CHANNEL = 1 << 16,
}

export interface ThreadMember {
    flags: ThreadMemberFlags;
    joinTimestamp: string;
    muteConfig: {
        end_time: string | null;
        selected_time_window: number;
    } | null;
    muted: boolean;
}

export enum ThreadMemberFlags {
    HAS_INTERACTED = 1 << 0,
    ALL_MESSAGES = 1 << 1,
    ONLY_MENTIONS = 1 << 2,
    NO_MESSAGES = 1 << 3,
}

/** @todo This may just be a user object from the API. */
export interface ChannelRecipient {
    avatar: string | null;
    avatar_decoration_data: SnakeCasedProperties<AvatarDecorationData> | null;
    bot?: boolean;
    clan: SnakeCasedProperties<UserClanData> | null;
    discriminator: string;
    display_name?: string | null;
    global_name: string | null;
    id: string;
    public_flags: UserFlags;
    username: string;
}

export interface SafetyWarning {
    /** @todo May not be null or optional. */
    dismiss_timestamp?: string | null;
    type: SafetyWarningType;
}

// Original name: SafetyWarningTypes
export enum SafetyWarningType {
    STRANGER_DANGER = 1,
    INAPPROPRIATE_CONVERSATION_TIER_1 = 2,
    INAPPROPRIATE_CONVERSATION_TIER_2 = 3,
}

export interface ThreadMetadata {
    archived: boolean;
    archiveTimestamp: string;
    autoArchiveDuration: number;
    createTimestamp: string | Nullish;
    invitable: boolean;
    locked: boolean;
}

// Original name: ChannelTypes
export enum ChannelType {
    GUILD_TEXT = 0,
    DM = 1,
    GUILD_VOICE = 2,
    GROUP_DM = 3,
    GUILD_CATEGORY = 4,
    GUILD_ANNOUNCEMENT = 5,
    GUILD_STORE = 6,
    ANNOUNCEMENT_THREAD = 10,
    PUBLIC_THREAD = 11,
    PRIVATE_THREAD = 12,
    GUILD_STAGE_VOICE = 13,
    GUILD_DIRECTORY = 14,
    GUILD_FORUM = 15,
    GUILD_MEDIA = 16,
    LOBBY = 17,
    UNKNOWN = 10_000,
}

export enum VideoQualityMode {
    AUTO = 1,
    FULL = 2,
}
