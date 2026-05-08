/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findStoreLazy } from "@webpack";

export const QuestStore = findStoreLazy("QuestStore") as QuestStoreType;

export enum QuestRewardType {
    REWARD_CODE = 1,
    IN_GAME = 2,
    COLLECTIBLE = 3,
    VIRTUAL_CURRENCY = 4,
    FRACTIONAL_PREMIUM = 5,
}

export enum QuestPlatform {
    CROSS_PLATFORM = 0,
    XBOX = 1,
    PLAYSTATION = 2,
    SWITCH = 3,
    PC = 4,
}

export enum QuestTargetedContent {
    GIFT_INVENTORY_SETTINGS_BADGE = 0,
    QUEST_BAR = 1,
    QUEST_INVENTORY_CARD = 2,
    QUESTS_EMBED = 3,
    ACTIVITY_PANEL = 4,
    QUEST_LIVE_STREAM = 5,
    MEMBERS_LIST = 6,
    QUEST_BADGE = 7,
    GIFT_INVENTORY_FOR_YOU = 8,
    GIFT_INVENTORY_OTHER = 9,
    QUEST_BAR_V2 = 10,
    QUEST_HOME_DESKTOP = 11,
    QUEST_HOME_MOBILE = 12,
    QUEST_BAR_MOBILE = 13,
    THIRD_PARTY_APP = 14,
    QUEST_BOTTOM_SHEET = 15,
    QUEST_EMBED_MOBILE = 16,
    QUEST_HOME_MOVE_CALLOUT = 17,
    DISCOVERY_SIDEBAR = 18,
    QUEST_SHARE_LINK = 19,
    CONNECTIONS_MODAL = 20,
    DISCOVERY_COMPASS = 21,
    TROPHY_CASE_CARD = 22,
    VIDEO_MODAL = 23,
    VIDEO_MODAL_END_CARD = 24,
    REWARD_MODAL = 25,
    EXCLUDED_QUEST_EMBED = 26,
    VIDEO_MODAL_MOBILE = 27,
    ORBS_ANNOUNCEMENT_MODAL = 28,
    ORBS_BALANCE_MENU = 29,
    QUEST_ENROLLMENT_BLOCKED_BOTTOM_SHEET = 30,
    ORBS_SHOP_HERO_CTA = 31,
    QUEST_ENROLLMENT_BLOCKED_MODAL = 32,
    INTERNAL_PREVIEW_TOOL = 33,
    ORBS_REHEAT_COACHMARK_CTA = 34,
    INVALID_QUEST_EMBED = 35,
    NOT_SHAREABLE_QUEST_EMBED = 36,
    QUEST_HOME_MOVE_CALLOUT_DISCOVER = 37,
    SPONSORED_QUEST_SHEET = 38,
    MOBILE_ORBS_ONBOARDING_DC = 39,
    RUNNING_ACTIVITY = 40,
    VIDEO_MODAL_PRIMARY_CTA = 41,
    QUEST_HOME_TAKEOVER = 42,
    USER_PROFILE_ACTIVITY = 43,
}

export enum QuestPlacement {
    INVALID_PLACEMENT = 0,
    DESKTOP_ACCOUNT_PANEL_AREA = 1,
    MOBILE_HOME_DOCK_AREA = 2,
}

export enum QuestRewardAssignmentMethod {
    ALL = 1,
    TIERED = 2,
}

export enum QuestRewardExpirationMode {
    NORMAL = 1,
    PREMIUM_EXTENSION = 2,
    PREMIUM_PERMANENT = 3,
}

export enum QuestFeature {
    POST_ENROLLMENT_CTA = 1,
    QUEST_BAR_V2 = 3,
    EXCLUDE_RUSSIA = 5,
    IN_HOUSE_CONSOLE_QUEST = 6,
    MOBILE_CONSOLE_QUEST = 7,
    START_QUEST_CTA = 8,
    REWARD_HIGHLIGHTING = 9,
    FRACTIONS_QUEST = 10,
    ADDITIONAL_REDEMPTION_INSTRUCTIONS = 11,
    PACING_V2 = 12,
    DISMISSAL_SURVEY = 13,
    MOBILE_QUEST_DOCK = 14,
    QUESTS_CDN = 15,
    PACING_CONTROLLER = 16,
    QUEST_HOME_FORCE_STATIC_IMAGE = 17,
    VIDEO_QUEST_FORCE_HLS_VIDEO = 18,
    VIDEO_QUEST_FORCE_END_CARD_CTA_SWAP = 19,
    EXPERIMENTAL_TARGETING_TRAITS = 20,
    DO_NOT_DISPLAY = 21,
    EXTERNAL_DIALOG = 22,
    MOBILE_ONLY_QUEST_PUSH_TO_MOBILE = 23,
    MANUAL_HEARTBEAT_INITIALIZATION = 24,
    CLOUD_GAMING_ACTIVITY = 25,
    NON_GAMING_PLAY_QUEST = 26,
    ACTIVITY_QUEST_AUTO_ENROLLMENT = 27,
    PACKAGE_ACTION_ADVENTURE = 28,
    PACKAGE_RPG_MMO = 29,
    PACKAGE_RACING_SPORTS = 30,
    PACKAGE_SANDBOX_CREATIVE = 31,
    PACKAGE_FAMILY_FRIENDLY = 32,
    PACKAGE_HOLIDAY_SEASON = 33,
    PACKAGE_NEW_YEARS = 34,
}

export enum QuestDismissibleContentFlags {
    GIFT_INVENTORY_SETTINGS_BADGE = 1,
    QUEST_BAR = 2,
    ACTIVITY_PANEL = 4,
    QUEST_LIVE_STREAM = 8,
}

export enum QuestTaskType {
    STREAM_ON_DESKTOP = "STREAM_ON_DESKTOP",
    PLAY_ON_DESKTOP = "PLAY_ON_DESKTOP",
    PLAY_ON_XBOX = "PLAY_ON_XBOX",
    PLAY_ON_PLAYSTATION = "PLAY_ON_PLAYSTATION",
    PLAY_ON_DESKTOP_V2 = "PLAY_ON_DESKTOP_V2",
    WATCH_VIDEO = "WATCH_VIDEO",
    WATCH_VIDEO_ON_MOBILE = "WATCH_VIDEO_ON_MOBILE",
    PLAY_ACTIVITY = "PLAY_ACTIVITY",
    ACHIEVEMENT_IN_GAME = "ACHIEVEMENT_IN_GAME",
    ACHIEVEMENT_IN_ACTIVITY = "ACHIEVEMENT_IN_ACTIVITY",
}

export enum QuestTaskJoinOperator {
    AND = "and",
    OR = "or",
}

export enum QuestErrorType {
    GENERIC = "generic",
    RATE_LIMITED = "rate_limited",
}

export enum QuestPlatformMode {
    DESKTOP = "desktop",
    CONSOLE = "console",
    SELECT = "select",
}

export enum QuestSharePolicy {
    SHAREABLE_EVERYWHERE = "shareable_everywhere",
    NOT_SHAREABLE = "not_shareable",
}

export interface QuestVideoAsset {
    url: string;
    width: number;
    height: number;
    thumbnail: string;
    caption?: string;
    transcript?: string;
}

export interface QuestTaskVideoAssets {
    video: QuestVideoAsset;
    videoLowRes?: QuestVideoAsset;
    videoHls?: QuestVideoAsset;
}

export interface QuestTaskVideoMessages {
    videoTitle: string;
}

export interface QuestTaskAchievementMessages {
    taskTitle: string;
    taskDescription: string;
}

export interface QuestTaskApplication {
    id: string;
}

export interface QuestTaskBase {
    type: QuestTaskType;
    target: number;
    applications?: QuestTaskApplication[];
    externalIds?: string[];
    eventName?: string;
    assets?: QuestTaskVideoAssets;
    messages?: QuestTaskVideoMessages | QuestTaskAchievementMessages;
}

export interface QuestTaskPlayOnDesktop extends QuestTaskBase {
    type: QuestTaskType.PLAY_ON_DESKTOP;
    applications: QuestTaskApplication[];
}

export interface QuestTaskPlayOnDesktopV2 extends QuestTaskBase {
    type: QuestTaskType.PLAY_ON_DESKTOP_V2;
    applications: QuestTaskApplication[];
}

export interface QuestTaskStreamOnDesktop extends QuestTaskBase {
    type: QuestTaskType.STREAM_ON_DESKTOP;
    applications: QuestTaskApplication[];
}

export interface QuestTaskPlayActivity extends QuestTaskBase {
    type: QuestTaskType.PLAY_ACTIVITY;
    applications: QuestTaskApplication[];
}

export interface QuestTaskPlayOnXbox extends QuestTaskBase {
    type: QuestTaskType.PLAY_ON_XBOX;
    externalIds: string[];
    applications: QuestTaskApplication[];
}

export interface QuestTaskPlayOnPlayStation extends QuestTaskBase {
    type: QuestTaskType.PLAY_ON_PLAYSTATION;
    externalIds: string[];
    applications: QuestTaskApplication[];
}

export interface QuestTaskWatchVideo extends QuestTaskBase {
    type: QuestTaskType.WATCH_VIDEO;
    assets: QuestTaskVideoAssets;
    messages: QuestTaskVideoMessages;
}

export interface QuestTaskWatchVideoOnMobile extends QuestTaskBase {
    type: QuestTaskType.WATCH_VIDEO_ON_MOBILE;
    assets: QuestTaskVideoAssets;
    messages: QuestTaskVideoMessages;
}

export interface QuestTaskAchievementInGame extends QuestTaskBase {
    type: QuestTaskType.ACHIEVEMENT_IN_GAME;
    eventName: string;
    messages: QuestTaskAchievementMessages;
    applications: QuestTaskApplication[];
}

export interface QuestTaskAchievementInActivity extends QuestTaskBase {
    type: QuestTaskType.ACHIEVEMENT_IN_ACTIVITY;
    eventName: string;
    messages: QuestTaskAchievementMessages;
    applications: QuestTaskApplication[];
}

export type QuestTask =
    | QuestTaskPlayOnDesktop
    | QuestTaskPlayOnDesktopV2
    | QuestTaskStreamOnDesktop
    | QuestTaskPlayActivity
    | QuestTaskPlayOnXbox
    | QuestTaskPlayOnPlayStation
    | QuestTaskWatchVideo
    | QuestTaskWatchVideoOnMobile
    | QuestTaskAchievementInGame
    | QuestTaskAchievementInActivity;

export interface QuestTaskConfig {
    tasks: Partial<Record<QuestTaskType, QuestTask>>;
    joinOperator: QuestTaskJoinOperator;
}

export interface QuestRewardMessages {
    redemptionInstructionsByPlatform: Partial<Record<QuestPlatform, string>>;
    name: string;
    nameWithArticle: string;
}

export interface QuestRewardBase {
    type: QuestRewardType;
    skuId: string;
    messages: QuestRewardMessages;
    asset?: string;
    assetVideo?: string | null;
}

export interface QuestRewardCode extends QuestRewardBase {
    type: QuestRewardType.REWARD_CODE;
    approximateCount?: number | null;
    redemptionLink?: string | null;
}

export interface QuestRewardInGame extends QuestRewardBase {
    type: QuestRewardType.IN_GAME;
}

export interface QuestRewardCollectible extends QuestRewardBase {
    type: QuestRewardType.COLLECTIBLE;
    expiresAt?: string;
    expirationMode?: QuestRewardExpirationMode;
    expiresAtPremium?: string | null;
}

export interface QuestRewardVirtualCurrency extends QuestRewardBase {
    type: QuestRewardType.VIRTUAL_CURRENCY;
    orbQuantity: number;
}

export interface QuestRewardFractionalPremium extends QuestRewardBase {
    type: QuestRewardType.FRACTIONAL_PREMIUM;
    quantity: number;
}

export type QuestReward =
    | QuestRewardCode
    | QuestRewardInGame
    | QuestRewardCollectible
    | QuestRewardVirtualCurrency
    | QuestRewardFractionalPremium;

export interface QuestRewardsConfig {
    assignmentMethod: QuestRewardAssignmentMethod;
    rewards: QuestReward[];
    rewardsExpireAt: string;
    platforms: QuestPlatform[];
}

export interface QuestAssets {
    hero: string;
    heroVideo: string | null;
    questBarHero: string;
    questBarHeroVideo: string | null;
    gameTile: string;
    logotype: string;
    gameTileLight: string;
    gameTileDark: string;
    logotypeLight: string;
    logotypeDark: string;
}

export interface QuestColors {
    primary: string;
    secondary: string;
}

export interface QuestMessages {
    questName: string;
    gameTitle: string;
    gamePublisher: string;
}

export interface QuestApplication {
    id: string;
    name: string;
}

export interface QuestCtaPlatformConfig {
    androidAppId?: string;
    iosAppId?: string;
}

export interface QuestCtaConfig {
    link: string;
    buttonLabel: string;
    subtitle?: string;
    android?: QuestCtaPlatformConfig;
    ios?: QuestCtaPlatformConfig;
}

export interface QuestCosponsorMetadata {
    name: string;
    logotype: string;
    redemptionInstructions: string;
    logotypeLight: string;
    logotypeDark: string;
}

export interface QuestConfig {
    id: string;
    configVersion: number;
    startsAt: string;
    expiresAt: string;
    features: QuestFeature[];
    application: QuestApplication;
    assets: QuestAssets;
    colors: QuestColors;
    messages: QuestMessages;
    taskConfigV2: QuestTaskConfig;
    rewardsConfig: QuestRewardsConfig;
    cosponsorMetadata?: QuestCosponsorMetadata;
    sharePolicy: QuestSharePolicy;
    ctaConfig: QuestCtaConfig;
}

export interface QuestProgressHeartbeat {
    lastBeatAt: string;
    expiresAt: string | null;
}

export interface QuestTaskProgress {
    eventName: string;
    value: number;
    updatedAt: string;
    completedAt: string | null;
    heartbeat: QuestProgressHeartbeat | null;
}

export interface QuestUserStatus {
    userId: string;
    questId: string;
    enrolledAt: string;
    completedAt: string | null;
    claimedAt: string | null;
    claimedTier: number | null;
    lastStreamHeartbeatAt: string | null;
    streamProgressSeconds: number;
    dismissedQuestContent: QuestDismissibleContentFlags;
    progress: Record<string, QuestTaskProgress>;
}

export interface Quest {
    id: string;
    preview: boolean;
    config: QuestConfig;
    userStatus: QuestUserStatus | null;
    targetedContent: QuestTargetedContent[];
}

export interface ExcludedQuest {
    id: string;
    replacementId: string;
}

export interface QuestStoreType {
    getName?(): string;
    addChangeListener?(callback: () => void): void;
    removeChangeListener?(callback: () => void): void;
    quests: Map<string, Quest>;
    excludedQuests: Map<string, ExcludedQuest>;
    claimedQuests?: Map<string, Quest>;
    getQuest(questId: string): Quest | undefined;
    isQuestExpired?(questId: string): boolean;
}
