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

