export const enum PermissionOverwriteType {
    ROLE = 0,
    MEMBER = 1,
    OWNER = 2
}

export const enum PermissionOverwriteRowType {
    EMPTY_STATE = 0,
    ADMINISTRATOR = 1,
    ROLE = 2,
    OWNER = 3,
    MEMBER = 4,
    USER = 5,
    GUILD = 6,
}

export const enum PermissionOverwriteSectionType {
    ROLES = 0,
    MEMBERS = 1,
    USERS = 2,
    GUILDS = 3,
}

export const enum ForumLayout {
    DEFAULT = 0,
    LIST = 1,
    GRID = 2,
}

export const enum SafetyWarningType {
    STRANGER_DANGER = 1,
    INAPPROPRIATE_CONVERSATION_TIER_1 = 2,
    INAPPROPRIATE_CONVERSATION_TIER_2 = 3,
    LIKELY_ATO = 4,
}

export const enum ChannelFlags {
    GUILD_FEED_REMOVED = 1,
    PINNED = 2,
    ACTIVE_CHANNELS_REMOVED = 4,
    REQUIRE_TAG = 16,
    IS_SPAM = 32,
    IS_GUILD_RESOURCE_CHANNEL = 128,
    CLYDE_AI = 256,
    IS_SCHEDULED_FOR_DELETION = 512,
    IS_MEDIA_CHANNEL = 1024,
    SUMMARIES_DISABLED = 2048,
    IS_ROLE_SUBSCRIPTION_TEMPLATE_PREVIEW_CHANNEL = 8192,
    IS_BROADCASTING = 16384,
    HIDE_MEDIA_DOWNLOAD_OPTIONS = 32768,
    IS_JOIN_REQUEST_INTERVIEW_CHANNEL = 65536,
    OBFUSCATED = 131072,
    IS_MODERATOR_REPORT_CHANNEL = 524288,
}

export const enum ChannelType {
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
    DM_SDK = 18,
    UNKNOWN = 10000,
}

/**
 * Pre-defined Sets of channel types for grouping related channels.
 * Each property is a Set<ChannelType> containing channel type numbers.
 */
export interface ChannelTypesSets {
    /** DM and GROUP_DM, channels that support calling. */
    CALLABLE: Set<ChannelType>;
    /** Channels that support text messages. */
    TEXTUAL: Set<ChannelType>;
    /** Forum and media channels, threads only, no direct messages. */
    GUILD_THREADS_ONLY: Set<ChannelType>;
    /** Channels that support stickers. */
    STICKERS: Set<ChannelType>;
    /** Channels that can be read/viewed. */
    READABLE: Set<ChannelType>;
    /** All guild channel types including threads. */
    GUILD: Set<ChannelType>;
    /** Guild channels excluding threads. */
    GUILD_CHANNEL: Set<ChannelType>;
    /** All thread types (announcement, public, private). */
    THREADS: Set<ChannelType>;
    /** DM and GROUP_DM, private/non-guild channels. */
    PRIVATE_CHANNEL: Set<ChannelType>;
    /** Announcement and public threads only. */
    PUBLIC_THREADS: Set<ChannelType>;
    /** Guild channels that can have threads. */
    GUILD_THREADED: Set<ChannelType>;
    /** Guild channels that are persisted/stored. */
    GUILD_STORED: Set<ChannelType>;
    /** Guild channels with text capability. */
    GUILD_TEXTUAL: Set<ChannelType>;
    /** Guild voice and stage channels. */
    GUILD_VOCAL: Set<ChannelType>;
    /** Thread types that support voice. */
    VOCAL_THREAD: Set<ChannelType>;
    /** All channels with voice capability. */
    VOCAL: Set<ChannelType>;
    /** Channels that support voice effects. */
    VOICE_EFFECTS: Set<ChannelType>;
    /** Guild text-only channels (no voice). */
    GUILD_TEXT_ONLY: Set<ChannelType>;
    /** Channels with character-limited names. */
    LIMITED_CHANNEL_NAME: Set<ChannelType>;
    /** Channels that support message search. */
    SEARCHABLE: Set<ChannelType>;
    /** Guild channels with user-generated content. */
    GUILD_USER_CONTENT: Set<ChannelType>;
    /** Guild channels that can have topics. */
    GUILD_TOPICAL: Set<ChannelType>;
    /** Guild channels that support webhooks. */
    GUILD_WEBHOOKS: Set<ChannelType>;
    /** Guild channels usable as system message channel. */
    GUILD_SYSTEM_CHANNEL: Set<ChannelType>;
    /** Guild channels that can have a parent category. */
    GUILD_PARENTABLE: Set<ChannelType>;
    /** Guild channels subject to auto-moderation. */
    GUILD_AUTO_MODERATED: Set<ChannelType>;
    /** Basic guild channel types for creation. */
    GUILD_BASIC: Set<ChannelType>;
    /** Guild channel types that can be created. */
    CREATEABLE_GUILD_CHANNELS: Set<ChannelType>;
    /** GROUP_DM only, multi-user DMs. */
    MULTI_USER_DMS: Set<ChannelType>;
    /** DM and GROUP_DM. */
    ALL_DMS: Set<ChannelType>;
    /** Channels that support invites. */
    INVITABLE: Set<ChannelType>;
    /** Guild channels supporting feed-featurable messages. */
    GUILD_FEED_FEATURABLE_MESSAGES: Set<ChannelType>;
    /** Channels supporting role subscriptions. */
    ROLE_SUBSCRIPTIONS: Set<ChannelType>;
    /** Channels supporting icon emojis. */
    ICON_EMOJIS: Set<ChannelType>;
    /** Channels that can be summarized. */
    SUMMARIZEABLE: Set<ChannelType>;
    /** Channels supporting content entry embeds. */
    CONTENT_ENTRY_EMBEDS: Set<ChannelType>;
    /** Channels that support polls. */
    POLLS: Set<ChannelType>;
    /** Channels that can launch activities. */
    ACTIVITY_LAUNCHABLE: Set<ChannelType>;
    /** All known channel types. */
    ALL: Set<ChannelType>;
}
