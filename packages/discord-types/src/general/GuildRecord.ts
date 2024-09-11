/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish, Optional } from "../internal";
import type { Clan } from "./Clan";
import type { IconSource } from "./misc";
import type { RecordBase } from "./Record";
import type { UserRecord } from "./UserRecord";

export type GuildRecordOwnProperties = Pick<GuildRecord, "afkChannelId" | "afkTimeout" | "application_id" | "banner" | "clan" | "defaultMessageNotifications" | "description" | "discoverySplash" | "explicitContentFilter" | "features" | "homeHeader" | "hubType" | "icon" | "id" | "joinedAt" | "latestOnboardingQuestionId" | "maxMembers" | "maxStageVideoChannelUsers" | "maxVideoChannelUsers" | "mfaLevel" | "name" | "nsfwLevel" | "ownerId" | "preferredLocale" | "premiumProgressBarEnabled" | "premiumSubscriberCount" | "premiumTier" | "publicUpdatesChannelId" | "rulesChannelId" | "safetyAlertsChannelId" | "splash" | "systemChannelFlags" | "systemChannelId" | "vanityURLCode" | "verificationLevel">;

export type GuildProperties = Optional<Omit<GuildRecordOwnProperties, "features" | "joinedAt">, Nullish, "afkTimeout" | "hubType" | "id" | "systemChannelFlags", true> & {
    features?: Iterable<GuildFeature> | ArrayLike<GuildFeature> | Nullish;
    joinedAt: Date | string | number;
};

export declare class GuildRecord<
    OwnProperties extends GuildRecordOwnProperties = GuildRecordOwnProperties
> extends RecordBase<OwnProperties> {
    constructor(guildProperties: GuildProperties);

    get acronym(): string;
    canHaveRaidActivityAlerts(): boolean;
    getApplicationId(): string | null;
    getEveryoneRoleId(): string;
    getIconSource(iconSize?: number, canAnimate?: boolean /* = false */): IconSource;
    getIconURL(iconSize?: number, canAnimate?: boolean /* = false */): string;
    getMaxEmojiSlots(): number;
    getMaxRoleSubscriptionEmojiSlots(): number;
    getMaxSoundboardSlots(): number;
    getSafetyAlertsChannelId(): string | null;
    hasCommunityInfoSubheader(): boolean;
    hasFeature(guildFeature: GuildFeature): boolean;
    hasVerificationGate(): boolean;
    isCommunity(): boolean;
    isLurker(): boolean;
    isNew(): boolean;
    isOwner(userOrUserId?: UserRecord | string | null): boolean;
    isOwnerWithRequiredMfaLevel(userOrUserId?: UserRecord | string | null): boolean;
    updateJoinedAt(joinedAt: Date | string): this;

    afkChannelId: string | null;
    afkTimeout: number;
    application_id: string | null;
    banner: string | null;
    clan: Clan | null;
    defaultMessageNotifications: UserNotificationSetting;
    description: string | null;
    discoverySplash: string | null;
    explicitContentFilter: GuildExplicitContentFilterType;
    features: Set<GuildFeature>;
    homeHeader: string | null;
    hubType: GuildHubType | null;
    icon: string | null;
    id: string;
    joinedAt: Date;
    latestOnboardingQuestionId: string | null;
    maxMembers: number;
    maxStageVideoChannelUsers: number;
    maxVideoChannelUsers: number;
    mfaLevel: MFALevel;
    name: string;
    nsfwLevel: GuildNSFWContentLevel;
    ownerId: string | null;
    preferredLocale: string;
    premiumProgressBarEnabled: boolean;
    premiumSubscriberCount: number;
    premiumTier: BoostedGuildTier;
    publicUpdatesChannelId: string | null;
    rulesChannelId: string | null;
    safetyAlertsChannelId: string | null;
    splash: string | null;
    systemChannelFlags: SystemChannelFlags;
    systemChannelId: string | null;
    vanityURLCode: string | null;
    verificationLevel: VerificationLevel;
}

// Original name: UserNotificationSettings
export enum UserNotificationSetting {
    ALL_MESSAGES = 0,
    ONLY_MENTIONS = 1,
    NO_MESSAGES = 2,
    NULL = 3,
}

// Original name: GuildExplicitContentFilterTypes
export enum GuildExplicitContentFilterType {
    DISABLED = 0,
    MEMBERS_WITHOUT_ROLES = 1,
    ALL_MEMBERS = 2,
}

// Original name: GuildFeatures
export enum GuildFeature {
    ACTIVITY_FEED_DISABLED_BY_USER = "ACTIVITY_FEED_DISABLED_BY_USER",
    ACTIVITY_FEED_ENABLED_BY_USER = "ACTIVITY_FEED_ENABLED_BY_USER",
    ANIMATED_BANNER = "ANIMATED_BANNER",
    ANIMATED_ICON = "ANIMATED_ICON",
    AUTO_MODERATION = "AUTO_MODERATION",
    AUTOMOD_TRIGGER_USER_PROFILE = "AUTOMOD_TRIGGER_USER_PROFILE",
    BANNER = "BANNER",
    BURST_REACTIONS = "BURST_REACTIONS",
    CHANNEL_ICON_EMOJIS_GENERATED = "CHANNEL_ICON_EMOJIS_GENERATED",
    CLAN = "CLAN",
    CLAN_DISCOVERY_DISABLED = "CLAN_DISCOVERY_DISABLED",
    CLAN_PILOT_GENSHIN = "CLAN_PILOT_GENSHIN",
    CLAN_PILOT_VALORANT = "CLAN_PILOT_VALORANT",
    CLYDE_DISABLED = "CLYDE_DISABLED",
    CLYDE_ENABLED = "CLYDE_ENABLED",
    COMMERCE = "COMMERCE",
    COMMUNITY = "COMMUNITY",
    CREATOR_MONETIZABLE = "CREATOR_MONETIZABLE",
    CREATOR_MONETIZABLE_DISABLED = "CREATOR_MONETIZABLE_DISABLED",
    CREATOR_MONETIZABLE_PENDING_NEW_OWNER_ONBOARDING = "CREATOR_MONETIZABLE_PENDING_NEW_OWNER_ONBOARDING",
    CREATOR_MONETIZABLE_PROVISIONAL = "CREATOR_MONETIZABLE_PROVISIONAL",
    CREATOR_MONETIZABLE_RESTRICTED = "CREATOR_MONETIZABLE_RESTRICTED",
    CREATOR_MONETIZABLE_WHITEGLOVE = "CREATOR_MONETIZABLE_WHITEGLOVE",
    CREATOR_STORE_PAGE = "CREATOR_STORE_PAGE",
    DISCOVERABLE = "DISCOVERABLE",
    ENABLED_DISCOVERABLE_BEFORE = "ENABLED_DISCOVERABLE_BEFORE",
    ENABLED_MODERATION_EXPERIENCE_FOR_NON_COMMUNITY = "ENABLED_MODERATION_EXPERIENCE_FOR_NON_COMMUNITY",
    EXPOSED_TO_ACTIVITIES_WTP_EXPERIMENT = "EXPOSED_TO_ACTIVITIES_WTP_EXPERIMENT",
    FEATURABLE = "FEATURABLE",
    GENSHIN_L30 = "GENSHIN_L30",
    GUILD_HOME_DEPRECATION_OVERRIDE = "GUILD_HOME_DEPRECATION_OVERRIDE",
    GUILD_HOME_OVERRIDE = "GUILD_HOME_OVERRIDE",
    GUILD_HOME_TEST = "GUILD_HOME_TEST",
    GUILD_ONBOARDING = "GUILD_ONBOARDING",
    GUILD_ONBOARDING_EVER_ENABLED = "GUILD_ONBOARDING_EVER_ENABLED",
    GUILD_ONBOARDING_HAS_PROMPTS = "GUILD_ONBOARDING_HAS_PROMPTS",
    GUILD_PRODUCTS_ALLOW_ARCHIVED_FILE = "GUILD_PRODUCTS_ALLOW_ARCHIVED_FILE",
    GUILD_SERVER_GUIDE = "GUILD_SERVER_GUIDE",
    GUILD_WEB_PAGE_VANITY_URL = "GUILD_WEB_PAGE_VANITY_URL",
    HAS_DIRECTORY_ENTRY = "HAS_DIRECTORY_ENTRY",
    HUB = "HUB",
    INTERNAL_EMPLOYEE_ONLY = "INTERNAL_EMPLOYEE_ONLY",
    INVITE_SPLASH = "INVITE_SPLASH",
    INVITES_DISABLED = "INVITES_DISABLED",
    LINKED_TO_HUB = "LINKED_TO_HUB",
    MEMBER_VERIFICATION_GATE_ENABLED = "MEMBER_VERIFICATION_GATE_ENABLED",
    MEMBER_VERIFICATION_MANUAL_APPROVAL = "MEMBER_VERIFICATION_MANUAL_APPROVAL",
    MORE_EMOJI = "MORE_EMOJI",
    MORE_SOUNDBOARD = "MORE_SOUNDBOARD",
    MORE_STICKERS = "MORE_STICKERS",
    NEW_THREAD_PERMISSIONS = "NEW_THREAD_PERMISSIONS",
    NEWS = "NEWS",
    NON_COMMUNITY_RAID_ALERTS = "NON_COMMUNITY_RAID_ALERTS",
    PARTNERED = "PARTNERED",
    PREVIEW_ENABLED = "PREVIEW_ENABLED",
    PRODUCTS_AVAILABLE_FOR_PURCHASE = "PRODUCTS_AVAILABLE_FOR_PURCHASE",
    RAID_ALERTS_DISABLED = "RAID_ALERTS_DISABLED",
    RAPIDASH_TEST = "RAPIDASH_TEST",
    ROLE_ICONS = "ROLE_ICONS",
    ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE = "ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE",
    ROLE_SUBSCRIPTIONS_ENABLED = "ROLE_SUBSCRIPTIONS_ENABLED",
    SHARD = "SHARD",
    SOUNDBOARD = "SOUNDBOARD",
    SUMMARIES_ENABLED_BY_USER = "SUMMARIES_ENABLED_BY_USER",
    SUMMARIES_ENABLED_GA = "SUMMARIES_ENABLED_GA",
    SUMMARIES_OPT_OUT_EXPERIENCE = "SUMMARIES_OPT_OUT_EXPERIENCE",
    TEXT_IN_STAGE_ENABLED = "TEXT_IN_STAGE_ENABLED",
    TEXT_IN_VOICE_ENABLED = "TEXT_IN_VOICE_ENABLED",
    THREADS_ENABLED = "THREADS_ENABLED",
    THREADS_ENABLED_TESTING = "THREADS_ENABLED_TESTING",
    VALORANT_L30 = "VALORANT_L30",
    VANITY_URL = "VANITY_URL",
    VERIFIED = "VERIFIED",
    VIP_REGIONS = "VIP_REGIONS",
    WELCOME_SCREEN_ENABLED = "WELCOME_SCREEN_ENABLED",
}

// Original name: GuildHubTypes
export enum GuildHubType {
    DEFAULT = 0,
    HIGH_SCHOOL = 1,
    COLLEGE = 2,
}

// Original name: MFALevels
export enum MFALevel {
    NONE = 0,
    ELEVATED = 1,
}

export enum GuildNSFWContentLevel {
    DEFAULT = 0,
    EXPLICIT = 1,
    SAFE = 2,
    AGE_RESTRICTED = 3,
}

// Original name: BoostedGuildTiers
export enum BoostedGuildTier {
    NONE = 0,
    TIER_1 = 1,
    TIER_2 = 2,
    TIER_3 = 3,
}

export enum SystemChannelFlags {
    SUPPRESS_JOIN_NOTIFICATIONS = 1 << 0,
    SUPPRESS_PREMIUM_SUBSCRIPTIONS = 1 << 1,
    SUPPRESS_GUILD_REMINDER_NOTIFICATIONS = 1 << 2,
    SUPPRESS_JOIN_NOTIFICATION_REPLIES = 1 << 3,
    SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATIONS = 1 << 4,
    SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATION_REPLIES = 1 << 5,
    SUPPRESS_CHANNEL_PROMPT_DEADCHAT = 1 << 7,
}

// Original name: VerificationLevels
export enum VerificationLevel {
    NONE = 0,
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    VERY_HIGH = 4,
}
