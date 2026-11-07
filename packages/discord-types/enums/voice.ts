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

export const enum VideoQualityMode {
    AUTO = 1,
    FULL = 2,
}

export const enum ApplicationStreamPresets {
    PRESET_VIDEO = 1,
    PRESET_DOCUMENTS = 2,
    PRESET_CUSTOM = 3,
    PRESET_AUTO = 4,
    PRESET_MOBILE_DEFAULT = 5,
    PRESET_MOBILE_PERFORMANCE = 6,
    PRESET_MOBILE_HIGH_QUALITY = 7,
}

export const enum ApplicationStreamResolutions {
    RESOLUTION_SOURCE = 0,
    RESOLUTION_480 = 480,
    RESOLUTION_720 = 720,
    RESOLUTION_1080 = 1080,
    RESOLUTION_1440 = 1440,
}

export const enum ApplicationStreamFPS {
    FPS_5 = 5,
    FPS_15 = 15,
    FPS_30 = 30,
    FPS_60 = 60,
}
