export const enum GuildScheduledEventStatus {
    SCHEDULED = 1,
    ACTIVE = 2,
    COMPLETED = 3,
    CANCELED = 4,
}

export const enum GuildScheduledEventEntityType {
    NONE = 0,
    STAGE_INSTANCE = 1,
    VOICE = 2,
    EXTERNAL = 3,
    PRIME_TIME = 4,
}

export const enum GuildScheduledEventPrivacyLevel {
    PUBLIC = 1,
    GUILD_ONLY = 2,
}

export const enum GuildNSFWLevel {
    DEFAULT = 0,
    EXPLICIT = 1,
    SAFE = 2,
    AGE_RESTRICTED = 3,
}

export const enum GuildVerificationLevel {
    NONE = 0,
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    VERY_HIGH = 4,
}

export const enum GuildExplicitContentFilter {
    DISABLED = 0,
    MEMBERS_WITHOUT_ROLES = 1,
    ALL_MEMBERS = 2,
}

export const enum GuildMFALevel {
    NONE = 0,
    ELEVATED = 1,
}

export const enum GuildDefaultMessageNotifications {
    ALL_MESSAGES = 0,
    ONLY_MENTIONS = 1,
}

export const enum GuildPremiumTier {
    NONE = 0,
    TIER_1 = 1,
    TIER_2 = 2,
    TIER_3 = 3,
}

export const enum GuildSettingsFlags {
    UNREADS_ALL_MESSAGES = 2048,
    UNREADS_ONLY_MENTIONS = 4096,
    OPT_IN_CHANNELS_OFF = 8192,
    OPT_IN_CHANNELS_ON = 16384,
}

export const enum SystemChannelFlags {
    SUPPRESS_JOIN_NOTIFICATIONS = 1,
    SUPPRESS_PREMIUM_SUBSCRIPTIONS = 2,
    SUPPRESS_GUILD_REMINDER_NOTIFICATIONS = 4,
    SUPPRESS_JOIN_NOTIFICATION_REPLIES = 8,
    SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATIONS = 16,
    SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATION_REPLIES = 32,
    SUPPRESS_CHANNEL_PROMPT_DEADCHAT = 128,
    SUPPRESS_UGC_ADDED_NOTIFICATIONS = 256,
}

export const enum GuildMemberFlags {
    DID_REJOIN = 1,
    COMPLETED_ONBOARDING = 2,
    BYPASSES_VERIFICATION = 4,
    STARTED_ONBOARDING = 8,
    IS_GUEST = 16,
    STARTED_HOME_ACTIONS = 32,
    COMPLETED_HOME_ACTIONS = 64,
    AUTOMOD_QUARANTINED_USERNAME_OR_GUILD_NICKNAME = 128,
    AUTOMOD_QUARANTINED_BIO = 256,
    DM_SETTINGS_UPSELL_ACKNOWLEDGED = 512,
    AUTOMOD_QUARANTINED_SERVER_TAG = 1024,
}

export const enum RoleFlags {
    IN_PROMPT = 1,
}

export const enum RecurrenceRuleFrequency {
    YEARLY = 0,
    MONTHLY = 1,
    WEEKLY = 2,
    DAILY = 3,
    HOURLY = 4,
    MINUTELY = 5,
    SECONDLY = 6,
}
