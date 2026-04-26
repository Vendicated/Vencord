export const enum RelationshipType {
    NONE = 0,
    FRIEND = 1,
    BLOCKED = 2,
    /**
     * @remarks Discord API calls this PENDING_INCOMING
     */
    INCOMING_REQUEST = 3,
    /**
     * @remarks Discord API calls this PENDING_OUTGOING
     */
    OUTGOING_REQUEST = 4,
    IMPLICIT = 5,
    SUGGESTION = 6,
}

export enum GiftIntentType {
    FRIEND_ANNIVERSARY = 0
}

export const enum ReadStateType {
    CHANNEL = 0,
    GUILD_EVENT = 1,
    NOTIFICATION_CENTER = 2,
    GUILD_HOME = 3,
    GUILD_ONBOARDING_QUESTION = 4,
    MESSAGE_REQUESTS = 5,
}

export const enum UserFlags {
    STAFF = 1 << 0,
    PARTNER = 1 << 1,
    HYPESQUAD = 1 << 2,
    BUG_HUNTER_LEVEL_1 = 1 << 3,
    MFA_SMS = 1 << 4,
    PREMIUM_PROMO_DISMISSED = 1 << 5,
    HYPESQUAD_ONLINE_HOUSE_1 = 1 << 6,
    HYPESQUAD_ONLINE_HOUSE_2 = 1 << 7,
    HYPESQUAD_ONLINE_HOUSE_3 = 1 << 8,
    PREMIUM_EARLY_SUPPORTER = 1 << 9,
    TEAM_PSEUDO_USER = 1 << 10,
    IS_HUBSPOT_CONTACT = 1 << 11,
    SYSTEM = 1 << 12,
    HAS_UNREAD_URGENT_MESSAGES = 1 << 13,
    BUG_HUNTER_LEVEL_2 = 1 << 14,
    UNDERAGE_DELETED = 1 << 15,
    VERIFIED_BOT = 1 << 16,
    VERIFIED_DEVELOPER = 1 << 17,
    CERTIFIED_MODERATOR = 1 << 18,
    BOT_HTTP_INTERACTIONS = 1 << 19,
    SPAMMER = 1 << 20,
    DISABLE_PREMIUM = 1 << 21,
    ACTIVE_DEVELOPER = 1 << 22,
    PROVISIONAL_ACCOUNT = 1 << 23,
}

export const enum StandingState {
    ALL_GOOD = 100,
    LIMITED = 200,
    VERY_LIMITED = 300,
    AT_RISK = 400,
    SUSPENDED = 500,
}
