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
    InteractionModal = 7,
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

export const enum InviteTargetType {
    STREAM = 1,
    EMBEDDED_APPLICATION = 2,
    ROLE_SUBSCRIPTIONS_PURCHASE = 3,
}

export const enum PremiumType {
    NONE = 0,
    TIER_1 = 1,
    TIER_2 = 2,
    TIER_0 = 3,
}
