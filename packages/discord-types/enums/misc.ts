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

export const enum EmojiIntention {
    REACTION = 0,
    STATUS = 1,
    COMMUNITY_CONTENT = 2,
    CHAT = 3,
    GUILD_STICKER_RELATED_EMOJI = 4,
    GUILD_ROLE_BENEFIT_EMOJI = 5,
    SOUNDBOARD = 6,
    VOICE_CHANNEL_TOPIC = 7,
    GIFT = 8,
    AUTO_SUGGESTION = 9,
    POLLS = 10,
    PROFILE = 11,
    MESSAGE_CONFETTI = 12,
    GUILD_PROFILE = 13,
    CHANNEL_NAME = 14,
    DEFAULT_REACT_EMOJI = 15,
}

export const enum LoadState {
    NOT_LOADED = 0,
    LOADING = 1,
    LOADED = 2,
    ERROR = 3,
}

export const enum ConnectionStatsFlags {
    TRANSPORT = 1,
    OUTBOUND = 2,
    INBOUND = 4,
    ALL = 7,
}

export const enum SpeakingFlags {
    NONE = 0,
    VOICE = 1,
    SOUNDSHARE = 2,
    PRIORITY = 4,
    HIDDEN = 8,
}

export const enum GoLiveQualityMode {
    AUTO = 1,
    FULL = 2,
}

export const enum VoiceProcessingStateReason {
    CPU_OVERUSE = 1,
    FAILED = 2,
    VAD_CPU_OVERUSE = 3,
    INITIALIZED = 4,
}
