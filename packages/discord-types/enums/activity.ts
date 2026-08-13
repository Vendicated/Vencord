export const enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    CUSTOM_STATUS = 4,
    COMPETING = 5,
    HANG_STATUS = 6
}

export const enum ActivityFlags {
    INSTANCE = 1 << 0,
    JOIN = 1 << 1,
    /** @deprecated */
    SPECTATE = 1 << 2,
    /** @deprecated */
    JOIN_REQUEST = 1 << 3,
    SYNC = 1 << 4,
    PLAY = 1 << 5,
    PARTY_PRIVACY_FRIENDS = 1 << 6,
    PARTY_PRIVACY_VOICE_CHANNEL = 1 << 7,
    EMBEDDED = 1 << 8,
    CONTEXTLESS = 1 << 9,
    SUPPORTS_GATEWAY_ACTIVITY_ACTION_JOIN = 1 << 10,
}

export const enum ActivityStatusDisplayType {
    NAME = 0,
    STATE = 1,
    DETAILS = 2
}

export const enum OrientationLockState {
    UNLOCKED = 1,
    PORTRAIT = 2,
    LANDSCAPE = 3,
}

export const enum ActivityGameMode {
    PLAY = 0,
    SPECTATE = 1,
}

export const enum ActivityLayout {
    FOCUSED = 0,
    PIP = 1,
    GRID = 2,
}

export const enum ActivityLabelType {
    NONE = 0,
    NEW = 1,
    UPDATED = 2,
}
