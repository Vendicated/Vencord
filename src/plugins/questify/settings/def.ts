/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { QuestRewardType, QuestTaskType } from "../utils/types";

export type QuestButtonDisplayMode = "always" | "unclaimed" | "never";
export type QuestButtonIndicatorMode = "pill" | "badge" | "both" | "none";
export type QuestButtonAction = "open-quests" | "context-menu" | "plugin-settings" | "nothing";
export type QuestTileGradient = "intense" | "default" | "black" | "hide";
export type QuestOrderStatus = "UNCLAIMED" | "CLAIMED" | "IGNORED" | "EXPIRED";
export type QuestSubsort = "Recent ASC" | "Recent DESC" | "Expiring ASC" | "Expiring DESC" | "Claimed ASC" | "Claimed DESC";
export interface QuestTileColorSetting {
    enabled: boolean;
    color: number;
}

export const defaultQuestTileUnclaimedColor = 2842239;
export const defaultQuestTileClaimedColor = 6105983;
export const defaultQuestTileIgnoredColor = 8334124;
export const defaultQuestTileExpiredColor = 2368553;
export const defaultQuestTileGradient: QuestTileGradient = "intense";
export const defaultQuestTilePreload = true;
export const defaultQuestTileUnclaimedColorSetting: QuestTileColorSetting = { enabled: true, color: defaultQuestTileUnclaimedColor };
export const defaultQuestTileClaimedColorSetting: QuestTileColorSetting = { enabled: true, color: defaultQuestTileClaimedColor };
export const defaultQuestTileIgnoredColorSetting: QuestTileColorSetting = { enabled: true, color: defaultQuestTileIgnoredColor };
export const defaultQuestTileExpiredColorSetting: QuestTileColorSetting = { enabled: true, color: defaultQuestTileExpiredColor };
export const defaultQuestOrder = ["UNCLAIMED", "CLAIMED", "IGNORED", "EXPIRED"] as const satisfies readonly QuestOrderStatus[];

export const defaultQuestButtonBadgeColor = defaultQuestTileUnclaimedColor;
export const defaultQuestButtonDisplay: QuestButtonDisplayMode = "always";
export const defaultQuestButtonIndicator: QuestButtonIndicatorMode = "both";
export const defaultLeftClickAction: QuestButtonAction = "open-quests";
export const defaultMiddleClickAction: QuestButtonAction = "plugin-settings";
export const defaultRightClickAction: QuestButtonAction = "context-menu";

export const defaultDisableQuestsEverything = false;
export const defaultDisableRelocationNotices = true;
export const defaultDisableSponsoredBanner = false;
export const defaultDisableAccountPanelPromo = true;
export const defaultDisableAccountPanelQuestProgress = false;
export const defaultDisableOrbsAndQuestsBadges = false;
export const defaultDisableFriendsListPromo = true;
export const defaultDisableMembersListPromo = true;
export const defaultResumeInterruptedQuests = false;
export const defaultAllowChangingDangerousSettings = false; // true -> Risky
export const defaultMakeMobileVideoQuestsDesktopCompatible = false; // true -> Risky
export const defaultCompleteVideoQuestsQuicker = false; // true -> Risky
export const defaultAutoCompleteQuestsSimultaneously = false; // true -> Risky
export const defaultNotifyOnQuestComplete = true;
export const defaultNotifyOnNewQuests = true;
export const defaultNotifyOnNewExcludedQuests = false;
export const defaultQuestCompletedAlertSound = "bop_message1";
export const defaultQuestCompletedAlertVolume = 100;

const questTaskTypes = [
    QuestTaskType.WATCH_VIDEO,
    QuestTaskType.WATCH_VIDEO_ON_MOBILE,
    QuestTaskType.ACHIEVEMENT_IN_ACTIVITY,
    QuestTaskType.ACHIEVEMENT_IN_GAME,
    QuestTaskType.PLAY_ACTIVITY,
    QuestTaskType.PLAY_ON_DESKTOP,
    QuestTaskType.PLAY_ON_DESKTOP_V2,
    QuestTaskType.STREAM_ON_DESKTOP,
    QuestTaskType.PLAY_ON_PLAYSTATION,
    QuestTaskType.PLAY_ON_XBOX,
] as const satisfies readonly QuestTaskType[];

export const autoCompleteQuestTaskTypes = [
    QuestTaskType.PLAY_ON_DESKTOP,
    QuestTaskType.PLAY_ON_XBOX,
    QuestTaskType.PLAY_ON_PLAYSTATION,
    QuestTaskType.PLAY_ACTIVITY,
    QuestTaskType.WATCH_VIDEO,
    QuestTaskType.WATCH_VIDEO_ON_MOBILE,
    QuestTaskType.ACHIEVEMENT_IN_ACTIVITY,
] as const satisfies readonly QuestTaskType[];

const desktopOnlyAutoCompleteQuestTypes = new Set<QuestTaskType>([
    QuestTaskType.PLAY_ON_DESKTOP,
    QuestTaskType.PLAY_ON_PLAYSTATION,
    QuestTaskType.PLAY_ON_XBOX,
    QuestTaskType.PLAY_ACTIVITY,
]);

export function isDesktopCompatible(questType: QuestTaskType): boolean {
    return IS_DISCORD_DESKTOP || !desktopOnlyAutoCompleteQuestTypes.has(questType);
}

export type AutoCompleteQuestTypes = Partial<Record<QuestTaskType, boolean>>;

export const defaultAutoCompleteQuestTypes = Object.fromEntries(
    autoCompleteQuestTaskTypes.map(questType => [questType, false])
) as AutoCompleteQuestTypes;

export type QuestButtonIncludedTypes = Record<QuestTaskType | QuestRewardType, boolean>;

export const defaultQuestButtonIncludedTypes: QuestButtonIncludedTypes = {
    ...Object.fromEntries(questTaskTypes.map(questType => [questType, true])),
    [QuestRewardType.REWARD_CODE]: true,
    [QuestRewardType.IN_GAME]: true,
    [QuestRewardType.COLLECTIBLE]: true,
    [QuestRewardType.VIRTUAL_CURRENCY]: true,
    [QuestRewardType.FRACTIONAL_PREMIUM]: true,
} as QuestButtonIncludedTypes;

export const defaultQuestButtonBadgeCount = 0;
export const defaultQuestFetchInterval = 2700;
export const defaultNewQuestAlertSound = "discodo";
export const defaultNewQuestAlertVolume = 100;
export const defaultNewExcludedQuestAlertSound = null;
export const defaultNewExcludedQuestAlertVolume = 100;

export const defaultUnclaimedSubsort: QuestSubsort = "Expiring ASC";
export const defaultClaimedSubsort: QuestSubsort = "Claimed DESC";
export const defaultIgnoredSubsort: QuestSubsort = "Recent DESC";
export const defaultExpiredSubsort: QuestSubsort = "Expiring DESC";
export const defaultIsOnQuestsPage = false;
export const defaultRememberQuestPageSort = true;
export const defaultRememberQuestPageFilters = true;
export const defaultLastQuestPageSort = "questify";
export const defaultLastQuestPageFilters = {} as Record<string, { group: string, filter: string; }>;
export const ignoredQuestIDsKey = "questIDs";
export const defaultIgnoredQuestIDs = { [ignoredQuestIDsKey]: [] } as Record<typeof ignoredQuestIDsKey, string[]>;
export const defaultResumeQuestIDs = {} as Record<string, // key: UserID
    { timestamp: number, questIDs: string[]; }>;
