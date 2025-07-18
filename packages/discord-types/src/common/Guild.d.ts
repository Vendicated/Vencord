import { Role } from './Role';
import { DiscordRecord } from './Record';

// copy(Object.keys(findByProps("CREATOR_MONETIZABLE")).map(JSON.stringify).join("|"))
export type GuildFeatures =
    "INVITE_SPLASH" | "VIP_REGIONS" | "VANITY_URL" | "MORE_EMOJI" | "MORE_STICKERS" | "MORE_SOUNDBOARD" | "VERIFIED" | "COMMERCE" | "DISCOVERABLE" | "COMMUNITY" | "FEATURABLE" | "NEWS" | "HUB" | "PARTNERED" | "ANIMATED_ICON" | "BANNER" | "ENABLED_DISCOVERABLE_BEFORE" | "WELCOME_SCREEN_ENABLED" | "MEMBER_VERIFICATION_GATE_ENABLED" | "PREVIEW_ENABLED" | "ROLE_SUBSCRIPTIONS_ENABLED" | "ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE" | "CREATOR_MONETIZABLE" | "CREATOR_MONETIZABLE_PROVISIONAL" | "CREATOR_MONETIZABLE_WHITEGLOVE" | "CREATOR_MONETIZABLE_DISABLED" | "CREATOR_MONETIZABLE_RESTRICTED" | "CREATOR_STORE_PAGE" | "CREATOR_MONETIZABLE_PENDING_NEW_OWNER_ONBOARDING" | "PRODUCTS_AVAILABLE_FOR_PURCHASE" | "GUILD_WEB_PAGE_VANITY_URL" | "THREADS_ENABLED" | "THREADS_ENABLED_TESTING" | "NEW_THREAD_PERMISSIONS" | "ROLE_ICONS" | "TEXT_IN_STAGE_ENABLED" | "TEXT_IN_VOICE_ENABLED" | "HAS_DIRECTORY_ENTRY" | "ANIMATED_BANNER" | "LINKED_TO_HUB" | "EXPOSED_TO_ACTIVITIES_WTP_EXPERIMENT" | "GUILD_HOME_DEPRECATION_OVERRIDE" | "GUILD_HOME_TEST" | "GUILD_HOME_OVERRIDE" | "GUILD_ONBOARDING" | "GUILD_ONBOARDING_EVER_ENABLED" | "GUILD_ONBOARDING_HAS_PROMPTS" | "GUILD_SERVER_GUIDE" | "INTERNAL_EMPLOYEE_ONLY" | "AUTO_MODERATION" | "INVITES_DISABLED" | "BURST_REACTIONS" | "SOUNDBOARD" | "SHARD" | "ACTIVITY_FEED_ENABLED_BY_USER" | "ACTIVITY_FEED_DISABLED_BY_USER" | "SUMMARIES_ENABLED_GA" | "LEADERBOARD_ENABLED" | "SUMMARIES_ENABLED_BY_USER" | "SUMMARIES_OPT_OUT_EXPERIENCE" | "CHANNEL_ICON_EMOJIS_GENERATED" | "NON_COMMUNITY_RAID_ALERTS" | "RAID_ALERTS_DISABLED" | "AUTOMOD_TRIGGER_USER_PROFILE" | "ENABLED_MODERATION_EXPERIENCE_FOR_NON_COMMUNITY" | "GUILD_PRODUCTS_ALLOW_ARCHIVED_FILE" | "CLAN" | "MEMBER_VERIFICATION_MANUAL_APPROVAL" | "FORWARDING_DISABLED" | "MEMBER_VERIFICATION_ROLLOUT_TEST" | "AUDIO_BITRATE_128_KBPS" | "AUDIO_BITRATE_256_KBPS" | "AUDIO_BITRATE_384_KBPS" | "VIDEO_BITRATE_ENHANCED" | "MAX_FILE_SIZE_50_MB" | "MAX_FILE_SIZE_100_MB" | "GUILD_TAGS" | "ENHANCED_ROLE_COLORS" | "PREMIUM_TIER_3_OVERRIDE" | "REPORT_TO_MOD_PILOT" | "TIERLESS_BOOSTING_SYSTEM_MESSAGE";
export type GuildPremiumFeatures =
    "ANIMATED_ICON" | "STAGE_CHANNEL_VIEWERS_150" | "ROLE_ICONS" | "GUILD_TAGS" | "BANNER" | "MAX_FILE_SIZE_50_MB" | "VIDEO_QUALITY_720_60FPS" | "STAGE_CHANNEL_VIEWERS_50" | "VIDEO_QUALITY_1080_60FPS" | "MAX_FILE_SIZE_100_MB" | "VANITY_URL" | "VIDEO_BITRATE_ENHANCED" | "STAGE_CHANNEL_VIEWERS_300" | "AUDIO_BITRATE_128_KBPS" | "ANIMATED_BANNER" | "TIERLESS_BOOSTING" | "ENHANCED_ROLE_COLORS" | "INVITE_SPLASH" | "AUDIO_BITRATE_256_KBPS" | "AUDIO_BITRATE_384_KBPS";

export class Guild extends DiscordRecord {
    constructor(guild: object);
    afkChannelId: string | undefined;
    afkTimeout: number;
    applicationCommandCounts: {
        0: number;
        1: number;
        2: number;
    };
    application_id: unknown;
    banner: string | undefined;
    defaultMessageNotifications: number;
    description: string | undefined;
    discoverySplash: string | undefined;
    explicitContentFilter: number;
    features: Set<GuildFeatures>;
    homeHeader: string | undefined;
    hubType: unknown;
    icon: string | undefined;
    id: string;
    joinedAt: Date;
    latestOnboardingQuestionId: string | undefined;
    maxMembers: number;
    maxStageVideoChannelUsers: number;
    maxVideoChannelUsers: number;
    mfaLevel: number;
    moderatorReporting: unknown;
    name: string;
    nsfwLevel: number;
    ownerConfiguredContentLevel: number;
    ownerId: string;
    preferredLocale: string;
    premiumFeatures: {
        additionalEmojiSlots: number;
        additionalSoundSlots: number;
        additionalStickerSlots: number;
        features: Array<GuildPremiumFeatures>;
    };
    premiumProgressBarEnabled: boolean;
    premiumSubscriberCount: number;
    premiumTier: number;
    profile: {
        badge: string | undefined;
        tag: string | undefined;
    } | undefined;
    publicUpdatesChannelId: string | undefined;
    roles: Record<string, Role>;
    rulesChannelId: string | undefined;
    safetyAlertsChannelId: string | undefined;
    splash: string | undefined;
    systemChannelFlags: number;
    systemChannelId: string | undefined;
    vanityURLCode: string | undefined;
    verificationLevel: number;
}
