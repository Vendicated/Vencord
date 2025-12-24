export const enum CloudUploadPlatform {
    REACT_NATIVE = 0,
    WEB = 1,
}

export const enum DraftType {
    ChannelMessage = 0,
    ThreadSettings = 1,
    FirstThreadMessage = 2,
    ApplicationLauncherCommand = 3,
    Poll = 4,
    SlashCommand = 5,
    ForwardContextMessage = 6,
}

export const enum GuildScheduledEventStatus {
    SCHEDULED = 1,
    ACTIVE = 2,
    COMPLETED = 3,
    CANCELED = 4,
}

export const enum GuildScheduledEventEntityType {
    STAGE_INSTANCE = 1,
    VOICE = 2,
    EXTERNAL = 3,
}

export const enum GuildScheduledEventPrivacyLevel {
    GUILD_ONLY = 2,
}

export const enum ParticipantType {
    STREAM = 0,
    HIDDEN_STREAM = 1,
    USER = 2,
    ACTIVITY = 3,
}

export const enum RTCPlatform {
    DESKTOP = 0,
    MOBILE = 1,
    XBOX = 2,
    PLAYSTATION = 3,
}

export const enum VideoSourceType {
    VIDEO = 0,
    CAMERA_PREVIEW = 1,
}
