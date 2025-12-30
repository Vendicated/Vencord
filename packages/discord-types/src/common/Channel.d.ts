import { ChannelFlags, ChannelType, ForumLayout, PermissionOverwriteType, SafetyWarningType, UserFlags, VideoQualityMode } from "../../enums";
import { DiscordRecord } from "./Record";

/** Permission overwrite for a role or member. */
export interface PermissionOverwrite {
    id: string;
    /** 0 = role, 1 = member. */
    type: PermissionOverwriteType;
    deny: bigint;
    allow: bigint;
}

/** Avatar decoration data for user profiles. */
export interface AvatarDecorationData {
    asset: string;
    expires_at: string | null;
    sku_id: string;
}

/** Clan identity information. */
export interface ClanData {
    badge: string;
    identity_enabled: boolean;
    identity_guild_id: string;
    tag: string;
}

/** Display name style configuration. */
export interface DisplayNameStyles {
    colors: number[];
    effect_id: number;
    font_id: number;
}

/** Collectible item data. */
export interface CollectibleItem {
    asset: string;
    expires_at: string | null;
    label: string;
    palette: string;
    sku_id: string;
}

/** User collectibles configuration. */
export interface Collectibles {
    nameplate?: CollectibleItem;
}

/** Raw recipient data from API. */
export interface RawRecipient {
    id: string;
    avatar: string | null;
    avatar_decoration_data: AvatarDecorationData | null;
    bot: boolean;
    clan: ClanData | null;
    collectibles: Collectibles | null;
    discriminator: string;
    display_name: string | null;
    display_name_styles: DisplayNameStyles | null;
    global_name: string | null;
    primary_guild: ClanData | null;
    public_flags: UserFlags;
    username: string;
}

/** Thread metadata for thread channels. */
export interface ThreadMetadata {
    archived: boolean;
    autoArchiveDuration: number;
    archiveTimestamp: string | undefined;
    createTimestamp: string | undefined;
    locked: boolean;
    invitable: boolean;
}

/** Icon emoji for channels that support it. */
export interface ChannelIconEmoji {
    id: string | null;
    name: string;
}

/** Thread member info, present when user has joined a thread. */
export interface ThreadMember {
    flags: number;
    joinTimestamp: string;
    muted: boolean;
    muteConfig: {
        end_time: string | null;
        selected_time_window: number;
    } | null;
}

/** Available tag for forum/media channels. */
export interface ForumTag {
    id: string;
    name: string;
    emojiId: string | null;
    emojiName: string | null;
    moderated: boolean;
    color: number | null;
}

/** Default reaction emoji for forum/media channels. */
export interface DefaultReactionEmoji {
    emojiId: string | null;
    emojiName: string;
}

/** Linked lobby for voice channels. */
export interface LinkedLobby {
    application_id: string;
    lobby_id: string;
    linked_by: string;
    linked_at: string;
    require_application_authorization: boolean;
}

/** Safety warning for DM spam detection. */
export interface SafetyWarning {
    id: string;
    type: SafetyWarningType;
    expiry: string;
    dismiss_timestamp: string | null;
}

/** Sort order for forum/media channels. */
export type ForumSortOrder = 0 | 1;

/** Tag setting for forum/media channels. */
export type ForumTagSetting = "match_all" | "match_some";

/** Discord channel object. */
export class Channel extends DiscordRecord {
    constructor(channel: object);

    /** Application ID for bot-created channels. */
    application_id: string | undefined;
    /** Applied tag IDs. Threads in forum/media channels only. */
    appliedTags: string[] | undefined;
    /** Available tags for forum/media channels. */
    availableTags: ForumTag[] | undefined;
    /** Internal, use bitrate getter. Voice channels only. */
    bitrate_: number | undefined;
    /** Whether blocked user warning was dismissed. */
    blockedUserWarningDismissed: boolean | undefined;
    /** Default auto-archive duration for threads in minutes. Guild text channels only. */
    defaultAutoArchiveDuration: number | undefined;
    /** Default layout for forum/media channels. */
    defaultForumLayout: ForumLayout | undefined;
    /** Default reaction emoji for forum/media channels. */
    defaultReactionEmoji: DefaultReactionEmoji | undefined;
    /** Default sort order for forum/media channels. */
    defaultSortOrder: ForumSortOrder | undefined;
    /** Default tag setting for forum/media channels. */
    defaultTagSetting: ForumTagSetting | undefined;
    /** Default slowmode for new threads. Guild text channels only. */
    defaultThreadRateLimitPerUser: number | undefined;
    /** Internal, use flags getter. */
    flags_: ChannelFlags;
    /** Guild ID. */
    guild_id: string;
    /** User ID who purchased HD streaming. */
    hdStreamingBuyerId: string | undefined;
    /** HD streaming end timestamp. */
    hdStreamingUntil: string | undefined;
    /** Icon hash for group DMs. */
    icon: string | undefined;
    /** Icon emoji for channels that support it. */
    iconEmoji: ChannelIconEmoji | undefined;
    /** Channel snowflake ID. */
    id: string;
    /** For DMs, whether this is a message request. */
    isMessageRequest: boolean;
    /** Timestamp when message request was created. */
    isMessageRequestTimestamp: string | null;
    /** Whether the DM is flagged as spam. */
    isSpam: boolean;
    /** ID of the last message in the channel. */
    lastMessageId: string | null;
    /** ISO timestamp of the last pinned message. */
    lastPinTimestamp: string | undefined;
    /** Linked lobby for voice channels. */
    linkedLobby: LinkedLobby | null;
    /** Thread member info if user joined thread. Threads only. */
    member: ThreadMember | undefined;
    /** Approximate member count. Threads only. */
    memberCount: number | undefined;
    /** Preview of member IDs in the thread. Threads only. */
    memberIdsPreview: string[] | undefined;
    /** Member list ID for guild channels. */
    memberListId: string | undefined;
    /** Approximate message count. Threads only. */
    messageCount: number | undefined;
    /** Channel name. */
    name: string;
    /** Custom nicknames in group DMs, keyed by user ID. */
    nicks: Record<string, string>;
    /** Internal, use nsfw getter. Guild channels only. */
    nsfw_: boolean;
    /** Origin channel ID for crossposted messages. */
    originChannelId: string | undefined;
    /** Owner ID for group DMs and threads. */
    ownerId: string | undefined;
    /** Parent category or channel ID. */
    parent_id: string;
    /** Parent channel type for threads. */
    parentChannelThreadType: ChannelType | undefined;
    /** Internal, use permissionOverwrites getter. Guild channels only. */
    permissionOverwrites_: Record<string, PermissionOverwrite>;
    /** Internal, use position getter. Guild channels only. */
    position_: number;
    /** Internal, use rateLimitPerUser getter. */
    rateLimitPerUser_: number;
    /** Raw recipient data from API. DMs and group DMs. */
    rawRecipients: RawRecipient[];
    /** Recipient flags for DMs. */
    recipientFlags: number;
    /** Recipient user IDs. DMs and group DMs. */
    recipients: string[];
    /** RTC region for voice channels, null for automatic. Voice channels only. */
    rtcRegion: string | null;
    /** Safety warnings for DM spam detection. */
    safetyWarnings: SafetyWarning[];
    /** Template string. */
    template: string | undefined;
    /** Theme color for group DMs. */
    themeColor: number | undefined;
    /** Thread metadata. Threads only. */
    threadMetadata: ThreadMetadata | undefined;
    /** Internal, use topic getter. */
    topic_: string | null;
    /** Total messages sent in thread. Threads only. */
    totalMessageSent: number | undefined;
    /** Channel type from ChannelType enum. */
    type: ChannelType;
    /** Internal, use userLimit getter. Voice channels only. */
    userLimit_: number | undefined;
    /** Channel version number. */
    version: number | undefined;
    /** Video quality mode for voice channels. Voice channels only. */
    videoQualityMode: VideoQualityMode | undefined;

    /** Computed access permissions for the current user. */
    get accessPermissions(): bigint;
    /** Bitrate in bits per second. Voice channels only. */
    get bitrate(): number;
    /** Channel flags bitmask. */
    get flags(): ChannelFlags;
    /** Whether HD streaming splash is active. */
    get isHDStreamSplashed(): boolean;
    /** Whether the channel is marked as NSFW. */
    get nsfw(): boolean;
    /** Permission overwrites keyed by role or user ID. */
    get permissionOverwrites(): Record<string, PermissionOverwrite>;
    /** Channel position in the channel list. */
    get position(): number;
    /** Slowmode delay in seconds. */
    get rateLimitPerUser(): number;
    /** Channel topic or description. */
    get topic(): string;
    /** Maximum users allowed in voice channel. 0 = unlimited. */
    get userLimit(): number;

    /** Computes allowed permissions for lurkers. */
    computeLurkerPermissionsAllowList(): bigint | undefined;
    /** Gets the application ID for bot-created channels. */
    getApplicationId(): string | undefined;
    /** Gets the default layout for forum channels. */
    getDefaultLayout(): ForumLayout;
    /** Gets the default sort order for forum channels. */
    getDefaultSortOrder(): ForumSortOrder;
    /** Gets the default tag setting for forum channels. */
    getDefaultTagSetting(): ForumTagSetting;
    /** Gets the guild ID this channel belongs to. */
    getGuildId(): string;
    /** Gets the recipient user ID for DMs. */
    getRecipientId(): string | undefined;
    /** Checks if the channel has a specific flag. */
    hasFlag(flag: number): boolean;
    /** Returns a new Channel with the given properties merged. */
    merge(props: Record<string, unknown>): this;
    /** Returns a new Channel with the given property set. */
    set(key: string, value: unknown): this;
    /** Converts the channel to a plain JavaScript object. */
    toJS(): Record<string, unknown>;
    /** Whether this is an active (non-archived) thread. */
    isActiveThread(): boolean;
    /** Whether this is an announcement thread. */
    isAnnouncementThread(): boolean;
    /** Whether this is an archived and locked thread. */
    isArchivedLockedThread(): boolean;
    /** Whether this is an archived thread. */
    isArchivedThread(): boolean;
    /** Whether this is a category channel. */
    isCategory(): boolean;
    /** Whether this is a DM channel. */
    isDM(): boolean;
    /** Whether this is a directory channel. */
    isDirectory(): boolean;
    /** Whether this is a forum channel. */
    isForumChannel(): boolean;
    /** Whether this is a forum-like channel (forum or media). */
    isForumLikeChannel(): boolean;
    /** Whether this is a forum post thread. */
    isForumPost(): boolean;
    /** Whether this is a group DM. */
    isGroupDM(): boolean;
    /** Whether this is a stage voice channel. */
    isGuildStageVoice(): boolean;
    /** Whether this is a guild voice or stage channel. */
    isGuildVocal(): boolean;
    /** Whether this is a guild vocal channel or vocal thread. */
    isGuildVocalOrThread(): boolean;
    /** Whether this is a guild voice channel. */
    isGuildVoice(): boolean;
    /** Whether this is a guild voice channel or voice thread. */
    isGuildVoiceOrThread(): boolean;
    /** Whether this channel supports listen mode. */
    isListenModeCapable(): boolean;
    /** Whether this is a locked thread. */
    isLockedThread(): boolean;
    /** Whether this channel is managed by an integration. */
    isManaged(): boolean;
    /** Whether this is a media channel. */
    isMediaChannel(): boolean;
    /** Whether this is a media post thread. */
    isMediaPost(): boolean;
    /** Whether this is a moderator report channel. */
    isModeratorReportChannel(): boolean;
    /** Whether this is a multi-user DM (group DM). */
    isMultiUserDM(): boolean;
    /** Whether the channel is marked as NSFW. */
    isNSFW(): boolean;
    /**
     * Checks if the given user is the channel owner.
     * @param userId User ID to check.
     */
    isOwner(userId: string): boolean;
    /** Whether this is a private channel (DM or group DM). */
    isPrivate(): boolean;
    /** Whether this channel supports ringing. */
    isRingable(): boolean;
    /** Whether this is a role subscription template preview channel. */
    isRoleSubscriptionTemplatePreviewChannel(): boolean;
    /** Whether this channel is scheduled for deletion. */
    isScheduledForDeletion(): boolean;
    /** Whether this is a system DM (from Discord). */
    isSystemDM(): boolean;
    /** Whether this is any type of thread. */
    isThread(): boolean;
    /** Whether this channel supports voice. */
    isVocal(): boolean;
    /** Whether this is a vocal thread. */
    isVocalThread(): boolean;

    /**
     * Adds a recipient to a group DM.
     * @param userId User ID to add.
     * @param nick Optional nickname for the user.
     * @param currentUserId Current user's ID.
     */
    addRecipient(userId: string, nick?: string | null, currentUserId?: string): this;
    /**
     * Removes a recipient from a group DM.
     * @param userId User ID to remove.
     */
    removeRecipient(userId: string): this;
}
