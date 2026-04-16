export const enum Theme {
    UNSET = 0,
    DARK = 1,
    LIGHT = 2,
    DARKER = 3,
    MIDNIGHT = 4,
}

export const enum UIDensity {
    UNSET = 0,
    COMPACT = 1,
    COZY = 2,
    RESPONSIVE = 3,
    DEFAULT = 4,
}

export const enum StickerAnimationSetting {
    ALWAYS = 0,
    ON_INTERACTION = 1,
    NEVER = 2,
}

export const enum UserNotificationSetting {
    ALL_MESSAGES = 0,
    ONLY_MENTIONS = 1,
    NO_MESSAGES = 2,
}

export const enum ChannelOverrideFlags {
    UNREADS_ONLY_MENTIONS = 512,
    UNREADS_ALL_MESSAGES = 1024,
    FAVORITED = 2048,
    OPT_IN_ENABLED = 4096,
    NEW_FORUM_THREADS_OFF = 8192,
    NEW_FORUM_THREADS_ON = 16384,
}

export const enum NotifyHighlights {
    NULL = 0,
    DISABLED = 1,
    ENABLED = 2,
}
