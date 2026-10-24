/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { QuestRewardType, QuestTaskType } from "@vencord/discord-types/enums";

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
export const defaultHiddenQuestStatuses: QuestOrderStatus[] = [];

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
export const defaultAcknowledgedNotices: Record<string, true> = {};
export const defaultMakeMobileVideoQuestsDesktopCompatible = false; // true -> Risky
export const defaultCompleteVideoQuestsQuicker = false; // true -> Risky
export const defaultPreventVideoQuestsPausing = false; // true -> Risky
export const defaultAutoEnrollQuests = false; // true -> Risky
export const defaultAutoCompleteQuests = false; // true -> Risky
export const defaultAutoCompleteQuestsSimultaneously = false; // true -> Risky
export const defaultHideNonAutoCompletableQuests = false;
export const defaultNotifyOnQuestComplete = true;
export const defaultNotifyOnNewQuests = true;
export const defaultNotifyOnNewExcludedQuests = false;
export const defaultQuestCompletedAlertSound = "bop_message1";
export const defaultQuestCompletedAlertVolume = 100;

interface QuestCapability {
    desktopOnly: boolean;
    autoComplete: boolean;
    requiresNativeCompletion?: boolean;
}

const questCapabilities = {
    [QuestTaskType.WATCH_VIDEO]: { desktopOnly: false, autoComplete: true },
    [QuestTaskType.WATCH_VIDEO_ON_MOBILE]: { desktopOnly: false, autoComplete: true },
    [QuestTaskType.ACHIEVEMENT_IN_ACTIVITY]: { desktopOnly: true, autoComplete: true, requiresNativeCompletion: true },
    [QuestTaskType.ACHIEVEMENT_IN_GAME]: { desktopOnly: true, autoComplete: false },
    [QuestTaskType.PLAY_ACTIVITY]: { desktopOnly: true, autoComplete: true },
    [QuestTaskType.PLAY_ON_DESKTOP]: { desktopOnly: true, autoComplete: true },
    // [QuestTaskType.PLAY_ON_DESKTOP_V2]: { desktopOnly: true, autoComplete: false },
    // [QuestTaskType.STREAM_ON_DESKTOP]: { desktopOnly: true, autoComplete: false },
    [QuestTaskType.PLAY_ON_PLAYSTATION]: { desktopOnly: true, autoComplete: true },
    [QuestTaskType.PLAY_ON_XBOX]: { desktopOnly: true, autoComplete: true },
} as const satisfies Partial<Record<QuestTaskType, QuestCapability>>;

type AutoCompleteQuestTaskType = {
    [Type in keyof typeof questCapabilities]: typeof questCapabilities[Type]["autoComplete"] extends true ? Type : never;
}[keyof typeof questCapabilities];

const questTaskTypes = Object.keys(questCapabilities) as (keyof typeof questCapabilities)[];
export const autoCompleteQuestTaskTypes = questTaskTypes.filter((type): type is AutoCompleteQuestTaskType => questCapabilities[type].autoComplete);

function getQuestCapability(questType: QuestTaskType): QuestCapability | undefined {
    return Object.hasOwn(questCapabilities, questType)
        ? questCapabilities[questType as keyof typeof questCapabilities]
        : undefined;
}

export function isEnrollmentCompatible(questType: QuestTaskType): boolean {
    const capability = getQuestCapability(questType);

    return capability != null && (!capability.desktopOnly || IS_DISCORD_DESKTOP);
}

export function isAutoCompleteCompatible(questType: QuestTaskType): boolean {
    const capability = getQuestCapability(questType);

    return isEnrollmentCompatible(questType) && capability?.autoComplete === true
        && (!capability.requiresNativeCompletion || typeof VencordNative?.pluginHelpers?.Questify?.complete === "function");
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
    { timestamp: number, questIDs: string[]; automaticQuestIDs?: string[]; }>;
