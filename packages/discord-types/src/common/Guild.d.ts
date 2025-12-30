import { DiscordRecord } from './Record';
import {
    GuildDefaultMessageNotifications,
    GuildExplicitContentFilter,
    GuildMFALevel,
    GuildNSFWLevel,
    GuildPremiumTier,
    GuildVerificationLevel,
    PermissionOverwriteType,
    SystemChannelFlags,
} from "../../enums";

// copy(Object.keys(findByProps("CREATOR_MONETIZABLE")).map(JSON.stringify).join("|"))
export type GuildFeatures =
    "ACTIVITY_FEED_DISABLED_BY_USER" | "ACTIVITY_FEED_ENABLED_BY_USER" | "AGE_VERIFICATION_LARGE_GUILD" | "ANIMATED_BANNER" | "ANIMATED_ICON" | "AUDIO_BITRATE_128_KBPS" | "AUDIO_BITRATE_256_KBPS" | "AUDIO_BITRATE_384_KBPS" | "AUTOMOD_TRIGGER_USER_PROFILE" | "AUTO_MODERATION" | "BANNER" | "BURST_REACTIONS" | "BYPASS_SLOWMODE_PERMISSION_MIGRATION_COMPLETE" | "CHANNEL_ICON_EMOJIS_GENERATED" | "CLAN" | "COMMERCE" | "COMMUNITY" | "CREATOR_MONETIZABLE" | "CREATOR_MONETIZABLE_DISABLED" | "CREATOR_MONETIZABLE_PENDING_NEW_OWNER_ONBOARDING" | "CREATOR_MONETIZABLE_PROVISIONAL" | "CREATOR_MONETIZABLE_RESTRICTED" | "CREATOR_MONETIZABLE_WHITEGLOVE" | "CREATOR_STORE_PAGE" | "DISCOVERABLE" | "ENABLED_DISCOVERABLE_BEFORE" | "ENABLED_MODERATION_EXPERIENCE_FOR_NON_COMMUNITY" | "ENHANCED_ROLE_COLORS" | "EXPOSED_TO_ACTIVITIES_WTP_EXPERIMENT" | "FEATURABLE" | "FORWARDING_DISABLED" | "GAME_SERVERS" | "GUILD_HOME_DEPRECATION_OVERRIDE" | "GUILD_HOME_OVERRIDE" | "GUILD_HOME_TEST" | "GUILD_ONBOARDING" | "GUILD_ONBOARDING_EVER_ENABLED" | "GUILD_ONBOARDING_HAS_PROMPTS" | "GUILD_PRODUCTS_ALLOW_ARCHIVED_FILE" | "GUILD_SERVER_GUIDE" | "GUILD_TAGS" | "GUILD_TAGS_BADGE_PACK_FLEX" | "GUILD_TAGS_BADGE_PACK_PETS" | "GUILD_WEB_PAGE_VANITY_URL" | "HAS_DIRECTORY_ENTRY" | "HUB" | "INTERNAL_EMPLOYEE_ONLY" | "INVITES_DISABLED" | "INVITE_SPLASH" | "LINKED_TO_HUB" | "MAX_FILE_SIZE_100_MB" | "MAX_FILE_SIZE_50_MB" | "MEMBER_VERIFICATION_GATE_ENABLED" | "MEMBER_VERIFICATION_MANUAL_APPROVAL" | "MEMBER_VERIFICATION_ROLLOUT_TEST" | "MORE_EMOJI" | "MORE_SOUNDBOARD" | "MORE_STICKERS" | "NEWS" | "NEW_THREAD_PERMISSIONS" | "NON_COMMUNITY_RAID_ALERTS" | "PARTNERED" | "PIN_PERMISSION_MIGRATION_COMPLETE" | "PREMIUM_TIER_3_OVERRIDE" | "PREVIEW_ENABLED" | "PRODUCTS_AVAILABLE_FOR_PURCHASE" | "RAID_ALERTS_DISABLED" | "RELAY_ENABLED" | "REPORT_TO_MOD_PILOT" | "REPORT_TO_MOD_SURVEY" | "ROLE_ICONS" | "ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE" | "ROLE_SUBSCRIPTIONS_ENABLED" | "SOCIAL_LAYER_STOREFRONT" | "SOUNDBOARD" | "SUMMARIES_ENABLED_BY_USER" | "SUMMARIES_ENABLED_GA" | "SUMMARIES_OPT_OUT_EXPERIENCE" | "TEXT_IN_STAGE_ENABLED" | "TEXT_IN_VOICE_ENABLED" | "THREADS_ENABLED" | "THREADS_ENABLED_TESTING" | "TIERLESS_BOOSTING_SYSTEM_MESSAGE" | "VANITY_URL" | "VERIFIED" | "VIDEO_BITRATE_ENHANCED" | "VIP_REGIONS" | "WELCOME_SCREEN_ENABLED";
export type GuildPremiumFeatures =
    "ANIMATED_ICON" | "STAGE_CHANNEL_VIEWERS_150" | "ROLE_ICONS" | "GUILD_TAGS" | "BANNER" | "MAX_FILE_SIZE_50_MB" | "VIDEO_QUALITY_720_60FPS" | "STAGE_CHANNEL_VIEWERS_50" | "VIDEO_QUALITY_1080_60FPS" | "MAX_FILE_SIZE_100_MB" | "VANITY_URL" | "VIDEO_BITRATE_ENHANCED" | "STAGE_CHANNEL_VIEWERS_300" | "AUDIO_BITRATE_128_KBPS" | "ANIMATED_BANNER" | "TIERLESS_BOOSTING" | "ENHANCED_ROLE_COLORS" | "INVITE_SPLASH" | "AUDIO_BITRATE_256_KBPS" | "AUDIO_BITRATE_384_KBPS";

export class Guild extends DiscordRecord {
    constructor(guild: object);
    afkChannelId: string | undefined;
    afkTimeout: number;
    application_id: string | null;
    banner: string | undefined;
    defaultMessageNotifications: GuildDefaultMessageNotifications;
    description: string | undefined;
    discoverySplash: string | undefined;
    explicitContentFilter: GuildExplicitContentFilter;
    features: Set<GuildFeatures>;
    homeHeader: string | undefined;
    hubType: number | null;
    icon: string | undefined;
    id: string;
    joinedAt: Date;
    latestOnboardingQuestionId: string | undefined;
    maxMembers: number;
    maxStageVideoChannelUsers: number;
    maxVideoChannelUsers: number;
    mfaLevel: GuildMFALevel;
    moderatorReporting: {
        moderatorReportingEnabled: boolean;
        moderatorReportChannelId: string;
    } | null;
    name: string;
    nsfwLevel: GuildNSFWLevel;
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
    premiumTier: GuildPremiumTier;
    profile: {
        badge: string | undefined;
        tag: string | undefined;
    } | undefined;
    publicUpdatesChannelId: string | undefined;
    rulesChannelId: string | undefined;
    safetyAlertsChannelId: string | undefined;
    splash: string | undefined;
    systemChannelFlags: SystemChannelFlags;
    systemChannelId: string | undefined;
    vanityURLCode: string | undefined;
    verificationLevel: GuildVerificationLevel;
}

export interface RoleOrUserPermission {
    type: PermissionOverwriteType;
    id?: string;
    permissions?: bigint;
    overwriteAllow?: bigint;
    overwriteDeny?: bigint;
}
