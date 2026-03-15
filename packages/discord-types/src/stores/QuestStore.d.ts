import {
    QuestDismissibleContentFlags,
    QuestFeature,
    QuestPlatform,
    QuestPlacement,
    QuestRewardAssignmentMethod,
    QuestRewardExpirationMode,
    QuestRewardType,
    QuestTargetedContent,
    QuestTaskType,
    QuestHomePlacement,
    QuestTranscriptFetchStatus,
    QuestErrorType,
    QuestSharePolicy,
    QuestTaskJoinOperator,
    QuestPlatformMode,
} from "../../enums";
import { FluxStore } from "./FluxStore";

/** Video asset for quest tasks. */
export interface QuestVideoAsset {
    /** Video URL path relative to CDN. */
    url: string;
    /** Width in pixels. */
    width: number;
    /** Height in pixels. */
    height: number;
    /** Thumbnail image URL. */
    thumbnail: string;
    /** VTT caption file URL. */
    caption?: string;
    /** Transcript file URL. */
    transcript?: string;
}

/** Video assets for video-based quest tasks. */
export interface QuestTaskVideoAssets {
    /** Full resolution video (1080p). */
    video: QuestVideoAsset;
    /** Low resolution video (720p). */
    videoLowRes?: QuestVideoAsset;
    /** HLS streaming video (.m3u8). */
    videoHls?: QuestVideoAsset;
}

/** Display messages for video-based quest tasks. */
export interface QuestTaskVideoMessages {
    videoTitle: string;
}

/** Display messages for achievement-based quest tasks. */
export interface QuestTaskAchievementMessages {
    taskTitle: string;
    taskDescription: string;
}

/** Application reference in quest tasks. */
export interface QuestTaskApplication {
    /** Discord application ID. */
    id: string;
}

/** Base properties shared by all quest task types. */
interface QuestTaskBase {
    /** Target value to complete (seconds for play tasks, seconds for video tasks). */
    target: number;
}

/** Play on desktop quest task. */
export interface QuestTaskPlayOnDesktop extends QuestTaskBase {
    type: QuestTaskType.PLAY_ON_DESKTOP;
    /** Applications that qualify for completion. */
    applications: QuestTaskApplication[];
}

/** Play on desktop v2 quest task with enhanced tracking. */
export interface QuestTaskPlayOnDesktopV2 extends QuestTaskBase {
    type: QuestTaskType.PLAY_ON_DESKTOP_V2;
    applications: QuestTaskApplication[];
}

/** Stream on desktop quest task. */
export interface QuestTaskStreamOnDesktop extends QuestTaskBase {
    type: QuestTaskType.STREAM_ON_DESKTOP;
    applications: QuestTaskApplication[];
}

/** Play Discord activity quest task. */
export interface QuestTaskPlayActivity extends QuestTaskBase {
    type: QuestTaskType.PLAY_ACTIVITY;
    applications: QuestTaskApplication[];
}

/** Play on Xbox quest task. */
export interface QuestTaskPlayOnXbox extends QuestTaskBase {
    type: QuestTaskType.PLAY_ON_XBOX;
    /** Xbox title IDs. */
    externalIds: string[];
    applications: QuestTaskApplication[];
}

/** Play on PlayStation quest task. */
export interface QuestTaskPlayOnPlayStation extends QuestTaskBase {
    type: QuestTaskType.PLAY_ON_PLAYSTATION;
    /** PlayStation title IDs (e.g., "PPSA09016_00"). */
    externalIds: string[];
    applications: QuestTaskApplication[];
}

/** Watch video quest task for desktop. */
export interface QuestTaskWatchVideo extends QuestTaskBase {
    type: QuestTaskType.WATCH_VIDEO;
    assets: QuestTaskVideoAssets;
    messages: QuestTaskVideoMessages;
}

/** Watch video quest task for mobile. */
export interface QuestTaskWatchVideoOnMobile extends QuestTaskBase {
    type: QuestTaskType.WATCH_VIDEO_ON_MOBILE;
    assets: QuestTaskVideoAssets;
    messages: QuestTaskVideoMessages;
}

/** Achievement in game quest task. */
export interface QuestTaskAchievementInGame extends QuestTaskBase {
    type: QuestTaskType.ACHIEVEMENT_IN_GAME;
    /** Event name dispatched when achievement is unlocked. */
    eventName: string;
    messages: QuestTaskAchievementMessages;
    applications: QuestTaskApplication[];
}

/** Achievement in Discord activity quest task. */
export interface QuestTaskAchievementInActivity extends QuestTaskBase {
    type: QuestTaskType.ACHIEVEMENT_IN_ACTIVITY;
    eventName: string;
    messages: QuestTaskAchievementMessages;
    applications: QuestTaskApplication[];
}

/** Union of all quest task types. */
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

/** Task configuration for a quest. */
export interface QuestTaskConfig {
    /** Map of task type to task configuration. */
    tasks: Partial<Record<QuestTaskType, QuestTask>>;
    /** How tasks are combined. Default is "or" (any task completes the quest). */
    joinOperator: QuestTaskJoinOperator;
}

/** Display messages for quest rewards. */
export interface QuestRewardMessages {
    /** Redemption instructions keyed by {@link QuestPlatform}. */
    redemptionInstructionsByPlatform: Partial<Record<QuestPlatform, string>>;
    /** Reward display name (e.g., "700 Orbs"). */
    name: string;
    /** Name with article (e.g., "700 Orbs"). */
    nameWithArticle: string;
}

/** Base properties shared by all quest reward types. */
interface QuestRewardBase {
    /** SKU ID for the reward entitlement. */
    skuId: string;
    messages: QuestRewardMessages;
}

/** Reward code reward type. */
export interface QuestRewardCode extends QuestRewardBase {
    type: QuestRewardType.REWARD_CODE;
    /** Reward image URL. */
    asset?: string;
    /** Reward video URL. */
    assetVideo?: string | null;
    /** Approximate codes remaining, null if unlimited. */
    approximateCount?: number | null;
    /** External URL to redeem the code. */
    redemptionLink?: string | null;
}

/** In-game reward type. */
export interface QuestRewardInGame extends QuestRewardBase {
    type: QuestRewardType.IN_GAME;
    asset?: string;
    assetVideo?: string | null;
}

/** Collectible avatar decoration reward type. */
export interface QuestRewardCollectible extends QuestRewardBase {
    type: QuestRewardType.COLLECTIBLE;
    asset?: string;
    assetVideo?: string | null;
    /** ISO timestamp when collectible expires. */
    expiresAt?: string;
    /** Expiration behavior. */
    expirationMode?: QuestRewardExpirationMode;
    /** Extended expiration for Nitro users. */
    expiresAtPremium?: string | null;
}

/** Virtual currency (Orbs) reward type. */
export interface QuestRewardVirtualCurrency extends QuestRewardBase {
    type: QuestRewardType.VIRTUAL_CURRENCY;
    /** Number of orbs awarded. */
    orbQuantity: number;
}

/** Fractional Nitro premium time reward type. */
export interface QuestRewardFractionalPremium extends QuestRewardBase {
    type: QuestRewardType.FRACTIONAL_PREMIUM;
    asset?: string;
    assetVideo?: string | null;
    /** Premium time quantity. */
    quantity: number;
}

/** Union of all quest reward types. */
export type QuestReward =
    | QuestRewardCode
    | QuestRewardInGame
    | QuestRewardCollectible
    | QuestRewardVirtualCurrency
    | QuestRewardFractionalPremium;

/** Rewards configuration for a quest. */
export interface QuestRewardsConfig {
    /** How rewards are distributed to users. */
    assignmentMethod: QuestRewardAssignmentMethod;
    /** Available reward options. */
    rewards: QuestReward[];
    /** ISO timestamp when rewards can no longer be claimed. */
    rewardsExpireAt: string;
    /** Platforms where rewards can be claimed. */
    platforms: QuestPlatform[];
}

/** Visual assets for quest display. */
export interface QuestAssets {
    /** Hero banner image URL. */
    hero: string;
    /** Hero banner video URL. */
    heroVideo: string | null;
    /** Quest bar hero image URL. */
    questBarHero: string;
    /** Quest bar hero video URL. */
    questBarHeroVideo: string | null;
    /** Game tile image URL. */
    gameTile: string;
    /** Game logotype image URL. */
    logotype: string;
    /** Light theme game tile URL. */
    gameTileLight: string;
    /** Dark theme game tile URL. */
    gameTileDark: string;
    /** Light theme logotype URL. */
    logotypeLight: string;
    /** Dark theme logotype URL. */
    logotypeDark: string;
}

/** Color scheme for quest UI theming. */
export interface QuestColors {
    /** Primary hex color (e.g., "#4752C4"). */
    primary: string;
    /** Secondary hex color. */
    secondary: string;
}

/** Display messages for quest UI. */
export interface QuestMessages {
    /** Quest display name. */
    questName: string;
    /** Game title. */
    gameTitle: string;
    /** Game publisher name. */
    gamePublisher: string;
}

/** Application reference in quest configuration. */
export interface QuestApplication {
    /** Discord application ID. */
    id: string;
    /** Application display name. */
    name: string;
}

/** Platform-specific app store configuration. */
export interface QuestCtaPlatformConfig {
    /** Android package name. */
    androidAppId?: string;
    /** iOS App Store ID. */
    iosAppId?: string;
}

/** Call-to-action button configuration. */
export interface QuestCtaConfig {
    /** CTA destination URL. */
    link: string;
    /** Button label text. */
    buttonLabel: string;
    /** Optional subtitle text. */
    subtitle?: string;
    /** Android-specific configuration. */
    android?: QuestCtaPlatformConfig;
    /** iOS-specific configuration. */
    ios?: QuestCtaPlatformConfig;
}

/** Co-sponsor branding metadata for partnered quests. */
export interface QuestCosponsorMetadata {
    /** Co-sponsor company name. */
    name: string;
    /** Logotype image URL. */
    logotype: string;
    /** Redemption instructions text. */
    redemptionInstructions: string;
    /** Light theme logotype URL. */
    logotypeLight: string;
    /** Dark theme logotype URL. */
    logotypeDark: string;
}

/** Complete quest configuration. */
export interface QuestConfig {
    /** Quest ID (snowflake). */
    id: string;
    /** Configuration version number. */
    configVersion: number;
    /** ISO timestamp when quest becomes available. */
    startsAt: string;
    /** ISO timestamp when quest expires. */
    expiresAt: string;
    /** Enabled feature flags for this quest. */
    features: QuestFeature[];
    /** Associated Discord application. */
    application: QuestApplication;
    /** Visual assets. */
    assets: QuestAssets;
    /** Color scheme. */
    colors: QuestColors;
    /** Display messages. */
    messages: QuestMessages;
    /** Task requirements configuration. */
    taskConfigV2: QuestTaskConfig;
    /** Rewards configuration. */
    rewardsConfig: QuestRewardsConfig;
    /** Optional co-sponsor branding. */
    cosponsorMetadata?: QuestCosponsorMetadata;
    /** Sharing policy. */
    sharePolicy: QuestSharePolicy;
    /** Call-to-action configuration. */
    ctaConfig: QuestCtaConfig;
}

/** Heartbeat tracking for quest progress. Updated via QUESTS_SEND_HEARTBEAT_SUCCESS. */
export interface QuestProgressHeartbeat {
    /** ISO timestamp of last heartbeat. */
    lastBeatAt: string;
    /** ISO timestamp when heartbeat tracking expires. */
    expiresAt: string | null;
}

/** Progress tracking for a single quest task. Updated via QUESTS_USER_STATUS_UPDATE. */
export interface QuestTaskProgress {
    /** Task event name matching {@link QuestTaskType}. */
    eventName: string;
    /** Current progress value (seconds played/watched). */
    value: number;
    /** ISO timestamp of last progress update. */
    updatedAt: string;
    /** ISO timestamp when task was completed, null if incomplete. */
    completedAt: string | null;
    /** Heartbeat tracking for active progress. */
    heartbeat: QuestProgressHeartbeat | null;
}

/** User's status for a specific quest. Updated via QUESTS_USER_STATUS_UPDATE. */
export interface QuestUserStatus {
    /** User ID (snowflake). */
    userId: string;
    /** Quest ID (snowflake). */
    questId: string;
    /** ISO timestamp when user enrolled. */
    enrolledAt: string;
    /** ISO timestamp when quest was completed, null if incomplete. */
    completedAt: string | null;
    /** ISO timestamp when reward was claimed, null if unclaimed. */
    claimedAt: string | null;
    /** Claimed reward tier for tiered rewards, null otherwise. */
    claimedTier: number | null;
    /** ISO timestamp of last stream heartbeat. */
    lastStreamHeartbeatAt: string | null;
    /** Total stream progress in seconds. */
    streamProgressSeconds: number;
    /** Bitmask of dismissed UI content. */
    dismissedQuestContent: QuestDismissibleContentFlags;
    /** Progress by task event name. */
    progress: Record<string, QuestTaskProgress>;
}

/** Quest object with configuration and user status. */
export interface Quest {
    /** Quest ID (snowflake). */
    id: string;
    /** Whether this is a preview/test quest. */
    preview: boolean;
    /** Quest configuration. */
    config: QuestConfig;
    /** User's status, null if not enrolled. */
    userStatus: QuestUserStatus | null;
    /** UI placements where this quest should appear. */
    targetedContent: QuestTargetedContent[];
}

/** Reference to an excluded quest. */
export interface ExcludedQuest {
    /** Excluded quest ID. */
    id: string;
    /** Replacement quest ID to show instead. */
    replacementId: string;
}

/** Ad tracking identifiers for quest delivery. */
export interface QuestAdIdentifiers {
    ad_id?: string;
    adset_id?: string;
    ad_set_id?: string;
    campaign_id?: string;
    creative_id?: string;
    creative_type?: string;
    /** Request ID from ad decision. */
    decision_id?: string;
    /** Whether quest was served via targeting. */
    is_targeted: boolean;
}

/** Quest delivery information for a placement. */
export interface QuestDeliveryInfo {
    /** Quest to deliver. */
    quest: Quest;
    /** Ad tracking data. */
    adDecisionData: QuestAdIdentifiers;
    /** Ad context for analytics. */
    adContext: string | null;
    /** Raw metadata for ad attribution. */
    metadataRaw: string | null;
    /** Sealed metadata for verification. */
    metadataSealed: string | null;
}

/** Ad decision cache entry for quest delivery. */
export interface QuestAdDecision {
    /** Quest ID or null if no quest to deliver. */
    questId: string | null;
    /** Unix timestamp when decision was fetched. */
    fetchedAt: number;
    /** Cache TTL in milliseconds. Default 6 hours. */
    ttlMillis: number;
    /** Ad tracking data. */
    adDecisionData: QuestAdIdentifiers;
    adContext: string | null;
    metadataRaw: string | null;
    metadataSealed: string | null;
}

/** Stream heartbeat failure tracking. Updated via QUESTS_SEND_HEARTBEAT_FAILURE. */
export interface StreamHeartbeatFailure {
    /** Quest ID. */
    questId: string;
    /** Stream identifier. */
    streamKey: string;
    /** Unix timestamp of first failure. */
    firstFailedAt: number;
}

/** Asset for quest home takeover display. */
export interface QuestHomeTakeoverAsset {
    /** Accessibility text. */
    altText: string;
    /** Asset type identifier. */
    assetType: string;
    /** Asset URL. */
    url: string;
}

/** Sponsor CTA for quest home takeover. */
export interface QuestHomeTakeoverCtaSponsor {
    ctaType: string;
    title: string;
    /** Sponsor destination URL. */
    url: string;
}

/** Quest CTA for quest home takeover. */
export interface QuestHomeTakeoverCtaQuest {
    ctaType: string;
    title: string;
    /** Quest ID to navigate to. */
    questId: string;
}

/** Quest home takeover banner configuration. */
export interface QuestHomeTakeoverConfig {
    placementType: QuestHomePlacement;
    /** Campaign identifier. */
    campaignId: string;
    labelTitle: string;
    labelSubtitle: string;
    /** Hero banner asset. */
    assetHeroImage: QuestHomeTakeoverAsset;
    /** Sponsor logo asset. */
    assetSponsorImage: QuestHomeTakeoverAsset;
    /** Sponsor link CTA. */
    ctaSponsorUrl: QuestHomeTakeoverCtaSponsor;
    /** Quest navigation CTAs. */
    ctaQuests: QuestHomeTakeoverCtaQuest[];
    /** ISO timestamp when takeover starts. */
    startsAt: string;
    /** ISO timestamp when takeover expires. */
    expiresAt: string;
}

/** Claimed reward code details. Returned by QUESTS_FETCH_REWARD_CODE_SUCCESS. */
export interface QuestClaimedRewardCode {
    userId: string;
    questId: string;
    /** The reward code string. */
    code: string;
    /** Platform the code is for. */
    platform: QuestPlatform;
    /** ISO timestamp when claimed. */
    claimedAt: string;
    /** Reward tier if applicable. */
    tier: number | null;
}

/** Entitlement item from reward claim. */
export interface QuestEntitlementItem {
    /** SKU ID. */
    skuId: string;
    /** Metadata containing reward details. */
    tenantMetadata: {
        questRewards?: {
            reward: {
                tag: QuestRewardType;
                rewardCode?: QuestClaimedRewardCode;
            };
        };
    } | null;
    /** Whether entitlement has been consumed. */
    consumed: boolean;
}

/** Error from reward claim operation. */
export interface QuestEntitlementError {
    code?: string;
    message?: string;
}

/** Response from claiming quest rewards. Returned by QUESTS_CLAIM_REWARD_SUCCESS. */
export interface QuestEntitlements {
    /** ISO timestamp when claimed. */
    claimedAt: string;
    /** Entitlement items received. */
    items: QuestEntitlementItem[];
    /** Errors encountered during claim. */
    errors: QuestEntitlementError[];
}

/** Video progress tracking state. */
export interface QuestVideoProgress {
    /** Current playback position in seconds. */
    timestampSec: number;
    /** Total video duration in seconds. */
    duration: number;
    /** Maximum position reached in seconds. */
    maxTimestampSec: number;
}

/** Transcript asset for quest videos. */
export interface QuestTranscriptAsset {
    questId: string;
    fetchStatus: QuestTranscriptFetchStatus;
    /** Transcript text content when loaded. */
    text?: string;
    /** Transcript file URL. */
    url?: string;
}

/** Error hint from console quest operations. */
export interface QuestConsoleErrorHint {
    type: QuestErrorType;
    /** User-facing error message. */
    message: string;
    /** Connected account ID that caused the error. */
    connected_account_id: string;
    /** Account type (e.g., "xbox", "playstation"). */
    connected_account_type: string;
}

/** Computed task details for display. */
export interface QuestTaskDetails {
    taskType: QuestTaskType;
    /** Target completion time in minutes. */
    targetMinutes: number;
    /** Progress as decimal (0.0 to 1.0). */
    percentComplete: number;
    /** Applications for this task. */
    applications?: QuestTaskApplication[];
}

/** Third-party task details for external quests. */
export interface QuestThirdPartyTaskDetails {
    description: string;
    /** Current progress value. */
    progress: number;
    /** Target completion value. */
    target: number;
    /** Progress as decimal (0.0 to 1.0). */
    percentComplete: number;
    title?: string;
}

/** Store for Discord Quests data. Manages quest configs, user progress, rewards, and delivery. */
export class QuestStore extends FluxStore {
    /** All quests keyed by quest ID. Updated via QUESTS_FETCH_CURRENT_QUESTS_SUCCESS. */
    get quests(): Map<string, Quest>;

    /** Quests the user is excluded from. Updated via QUESTS_FETCH_CURRENT_QUESTS_SUCCESS. */
    get excludedQuests(): Map<string, ExcludedQuest>;

    /** Quests with claimed rewards. Updated via QUESTS_FETCH_CLAIMED_QUESTS_SUCCESS. */
    get claimedQuests(): Map<string, Quest>;

    /** Whether fetching current quests. Set via QUESTS_FETCH_CURRENT_QUESTS_BEGIN. */
    get isFetchingCurrentQuests(): boolean;

    /** Whether fetching claimed quests. Set via QUESTS_FETCH_CLAIMED_QUESTS_BEGIN. */
    get isFetchingClaimedQuests(): boolean;

    /** Unix timestamp of last current quests fetch. Default 0. */
    get lastFetchedCurrentQuests(): number;

    /** Unix timestamp of last quest-to-deliver fetch. Default 0. */
    get lastFetchedQuestToDeliver(): number;

    /** Whether fetching quest to deliver. Set via QUESTS_FETCH_QUEST_TO_DELIVER_BEGIN. */
    get isFetchingQuestToDeliver(): boolean;

    /** Override quest for delivery testing. Set via QUESTS_DELIVERY_OVERRIDE. */
    get questDeliveryOverride(): Quest | undefined;

    /** Quest delivery info keyed by {@link QuestPlacement}. Updated via QUESTS_FETCH_QUEST_TO_DELIVER_SUCCESS. */
    get questToDeliverForPlacement(): Map<QuestPlacement, QuestDeliveryInfo>;

    /** Date until enrollment is blocked, null if not blocked. Set via QUESTS_ENROLL_FAILURE. */
    get questEnrollmentBlockedUntil(): Date | null;

    /** Ad decision cache keyed by {@link QuestPlacement}. Updated via QUESTS_FETCH_QUEST_TO_DELIVER_SUCCESS. */
    get questAdDecisionByPlacement(): Map<QuestPlacement, QuestAdDecision>;

    /** Quest configs keyed by quest ID. */
    get questConfigs(): Map<string, QuestConfig>;

    /** Whether fetching preview for a quest. */
    isFetchingQuestPreview(questId: string): boolean;

    /** Whether fetching quest to deliver for a placement. */
    isFetchingQuestToDeliverByPlacement(placement: QuestPlacement): boolean;

    /** Gets preview fetch error for a quest. */
    getFetchQuestPreviewError(questId: string): QuestErrorType | undefined;

    /** Whether user is currently enrolling in a quest. Set via QUESTS_ENROLL_BEGIN. */
    isEnrolling(questId: string): boolean;

    /** Whether user is currently claiming reward for a quest. Set via QUESTS_CLAIM_REWARD_BEGIN. */
    isClaimingReward(questId: string): boolean;

    /** Whether fetching reward code for a quest. Set via QUESTS_FETCH_REWARD_CODE_BEGIN. */
    isFetchingRewardCode(questId: string): boolean;

    /** Whether dismissing content for a quest. Set via QUESTS_DISMISS_CONTENT_BEGIN. */
    isDismissingContent(questId: string): boolean;

    /** Gets claimed reward code for a quest. Updated via QUESTS_FETCH_REWARD_CODE_SUCCESS. */
    getRewardCode(questId: string): QuestClaimedRewardCode | undefined;

    /** Gets entitlement items for a quest. Updated via QUESTS_CLAIM_REWARD_SUCCESS. */
    getRewards(questId: string): QuestEntitlementItem[] | undefined;

    /** Gets stream heartbeat failure info. Cleared via STREAM_CLOSE. */
    getStreamHeartbeatFailure(streamKey: string): StreamHeartbeatFailure | undefined;

    /** Gets a quest by ID. */
    getQuest(questId: string): Quest | undefined;

    /** Gets quest config by ID. */
    getQuestConfig(questId: string): QuestConfig | undefined;

    /** Whether quest has active desktop progress. Updated via QUESTS_SEND_HEARTBEAT_SUCCESS. */
    isProgressingOnDesktop(questId: string): boolean;

    /** Gets selected task platform for a quest. Set via QUESTS_SELECT_TASK_PLATFORM. */
    selectedTaskPlatform(questId: string): QuestPlatformMode | null;

    /** Gets optimistic progress for a task. Set via QUESTS_UPDATE_OPTIMISTIC_PROGRESS, cleared via QUESTS_RESET_OPTIMISTIC_PROGRESS. */
    getOptimisticProgress(questId: string, taskEventName: string): number | undefined;

    /** Gets map of quest IDs to expired status. Computed from quest config expiresAt. */
    getExpiredQuestsMap(): Map<string, boolean>;

    /** Whether a quest has expired. Computed from quest config expiresAt. */
    isQuestExpired(questId: string): boolean;

    /** Gets quest loaded via preview tool. Updated via QUESTS_FETCH_PREVIEW_SUCCESS. */
    getQuestLoadedViaPreview(questId: string): Quest | undefined;

    /** Whether fetching quest home takeover config. Set via QUESTS_FETCH_QUEST_HOME_TAKEOVER_BEGIN. */
    isFetchingQuestHomeTakeover(): boolean;

    /** Gets quest home takeover config. Updated via QUESTS_FETCH_QUEST_HOME_TAKEOVER_SUCCESS. */
    getQuestHomeTakeoverConfig(): QuestHomeTakeoverConfig | null;

    /** Gets Unix timestamp of last takeover fetch, null if never fetched. */
    getLastFetchedQuestHomeTakeover(): number | null;
}
