/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getQuestifySettings, useQuestifySettings } from "../settings/access";
import { ignoredQuestIDsKey } from "../settings/def";
import { getActiveAutoCompletes, getAutoCompleteQuestTarget, getQuestAutoCompleteEntry } from "./completion";
import { type QuestIncludedTypes, questMatchesIncludedTypes } from "./filtering";
import { type Quest, QuestStore, QuestTaskType } from "./types";

export interface QuestTask {
    type: QuestTaskType;
    target: number;
    applications?: { id: string; }[];
}

export enum QuestStatus {
    Claimed = "CLAIMED",
    Unclaimed = "UNCLAIMED",
    Ignored = "IGNORED",
    Expired = "EXPIRED",
    Unknown = "UNKNOWN"
}

const showcaseSwitchLeewaySeconds = 3;
let showcasedAutoCompleteQuestId: string | null = null;

const questProgressTaskPriority = [
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

interface QuestPanelPercentCompleteOptions {
    quest?: Quest | null;
    percentCompleteText?: string;
}

interface QuestPanelPercentCompleteResult {
    percentComplete: number;
    percentCompleteText?: string;
}

interface QuestProgressEntry {
    eventName?: QuestTaskType;
    heartbeat?: { lastBeatAt?: string | null; } | null;
    updatedAt?: string | null;
}

export function refreshQuest(quest: Quest): Quest {
    return QuestStore.getQuest(quest.id) ?? quest;
}

export function isVideoQuestTask(taskType: QuestTaskType): boolean {
    return taskType === QuestTaskType.WATCH_VIDEO || taskType === QuestTaskType.WATCH_VIDEO_ON_MOBILE;
}

function getQuestTaskByType(quest: Quest, taskType: QuestTaskType): QuestTask | null {
    const task = quest.config.taskConfigV2?.tasks[taskType] as QuestTask | undefined;

    return task ?? null;
}

function getVideoQuestTask(quest: Quest): QuestTask | null {
    return getQuestTaskByType(quest, QuestTaskType.WATCH_VIDEO)
        ?? getQuestTaskByType(quest, QuestTaskType.WATCH_VIDEO_ON_MOBILE);
}

function getProgressTimestamp(progress: QuestProgressEntry): number {
    const timestamp = progress.heartbeat?.lastBeatAt ?? progress.updatedAt;
    const time = timestamp ? new Date(timestamp).getTime() : 0;

    return Number.isFinite(time) ? time : 0;
}

function getLatestProgressTask(quest: Quest): QuestTask | null {
    const progressEntries = Object.entries(quest.userStatus?.progress ?? {}) as [QuestTaskType, QuestProgressEntry][];

    progressEntries.sort(([, a], [, b]) => getProgressTimestamp(b) - getProgressTimestamp(a));

    for (const [fallbackTaskType, progress] of progressEntries) {
        const task = getQuestTaskByType(quest, progress.eventName ?? fallbackTaskType);

        if (task) {
            return task;
        }
    }

    return null;
}

function getQuestProgressTask(quest: Quest): QuestTask | null {
    if (!quest.config.taskConfigV2?.tasks) {
        return null;
    }

    const progressTask = getLatestProgressTask(quest) ?? getVideoQuestTask(quest);

    if (progressTask) {
        return progressTask;
    }

    for (const taskType of questProgressTaskPriority) {
        const task = getQuestTaskByType(quest, taskType);

        if (task) {
            return task;
        }
    }

    return null;
}

export function getQuestStoredProgress(quest: Quest, task: QuestTask): number | null {
    if (quest.userStatus?.completedAt) {
        return task.target;
    }

    const progressMap = quest.userStatus?.progress;

    if (!progressMap) {
        return null;
    }

    if (isVideoQuestTask(task.type)) {
        const watchProgress = progressMap.WATCH_VIDEO?.value;
        const mobileProgress = progressMap.WATCH_VIDEO_ON_MOBILE?.value;

        return watchProgress !== undefined || mobileProgress !== undefined
            ? Math.max(watchProgress ?? 0, mobileProgress ?? 0)
            : null;
    }

    return progressMap[task.type]?.value ?? null;
}

function getCurrentIgnoredQuestIds(): string[] {
    return Array.from(getQuestifySettings().ignoredQuestIDs[ignoredQuestIDsKey] ?? []);
}

function getAutoCompleteShowcaseQuest(): Quest | null {
    let bestQuest: Quest | null = null;
    let bestTimeRemaining = Infinity;
    let currentQuest: Quest | null = null;
    let currentTimeRemaining = Infinity;

    for (const entry of getActiveAutoCompletes()) {
        const quest = QuestStore.getQuest(entry.questId);

        if (!quest) {
            continue;
        }

        const progress = entry.progress ?? 0;
        const { adjusted: target } = getAutoCompleteQuestTarget(entry.task);
        const timeRemaining = Math.max(0, target - progress);

        if (entry.questId === showcasedAutoCompleteQuestId) {
            currentQuest = quest;
            currentTimeRemaining = timeRemaining;
        }

        if (timeRemaining < bestTimeRemaining) {
            bestQuest = quest;
            bestTimeRemaining = timeRemaining;
        }
    }

    if (!bestQuest) {
        showcasedAutoCompleteQuestId = null;

        return null;
    }

    if (currentQuest && bestQuest.id !== currentQuest.id && bestTimeRemaining >= currentTimeRemaining - showcaseSwitchLeewaySeconds) {
        return currentQuest;
    }

    showcasedAutoCompleteQuestId = bestQuest.id;

    return bestQuest;
}

function getMostRecentlyCompletedUnclaimedQuest(): Quest | null {
    return Array.from(QuestStore.quests.values())
        .filter(quest => (
            Boolean(quest.userStatus?.completedAt)
            && getQuestStatus(quest, getCurrentIgnoredQuestIds()) === QuestStatus.Unclaimed
        ))
        .sort((a, b) => {
            const aTime = new Date(a.userStatus?.completedAt ?? 0).getTime();
            const bTime = new Date(b.userStatus?.completedAt ?? 0).getTime();

            return bTime - aTime;
        })[0] ?? null;
}

export function getQuestPanelOverride(quest: Quest | null): Quest | null {
    const panelState = useQuestifySettings(["disableQuestsEverything", "disableAccountPanelPromo", "disableAccountPanelQuestProgress"]);

    if (panelState.disableQuestsEverything) {
        return null;
    }

    if (panelState.disableAccountPanelPromo && panelState.disableAccountPanelQuestProgress) {
        return null;
    }

    if (panelState.disableAccountPanelQuestProgress) {
        return quest;
    }

    const nextQuest = getAutoCompleteShowcaseQuest() ?? getMostRecentlyCompletedUnclaimedQuest();

    return nextQuest ?? (panelState.disableAccountPanelPromo ? null : quest);
}

export function shouldForceQuestPanelVisible(quest: Quest | null): boolean {
    const settings = getQuestifySettings();

    if (!quest || settings.disableQuestsEverything || settings.disableAccountPanelQuestProgress) {
        return false;
    }

    return getQuestAutoCompleteEntry(refreshQuest(quest)) !== null;
}

export function getQuestPanelPercentComplete({
    quest,
    percentCompleteText,
}: QuestPanelPercentCompleteOptions): QuestPanelPercentCompleteResult | null {
    if (!quest) {
        return null;
    }

    const refreshedQuest = refreshQuest(quest);
    const activeAutoComplete = getQuestAutoCompleteEntry(refreshedQuest);
    const task: QuestTask | null = activeAutoComplete?.task ?? getQuestProgressTask(refreshedQuest);

    if (!task) {
        return null;
    }

    const questTarget = activeAutoComplete
        ? getAutoCompleteQuestTarget(task)
            .adjusted
        : task.target;
    const questProgress = activeAutoComplete?.progress ?? getQuestStoredProgress(refreshedQuest, task);

    if (!questTarget || questProgress === null) {
        return null;
    }

    const percentComplete = Math.min(1, questProgress / questTarget);

    if (!percentCompleteText) {
        return { percentComplete };
    }

    return {
        percentComplete,
        percentCompleteText: `${Math.floor(percentComplete * 100)}%`,
    };
}

export function getQuestStatus(
    quest: Quest,
    ignoredQuestIds: ReadonlyArray<string>,
    checkIgnored: boolean = true,
): QuestStatus {
    const completedQuest = quest.userStatus?.completedAt;
    const claimedQuest = quest.userStatus?.claimedAt;
    const expiredQuest = new Date(quest.config.expiresAt) < new Date();
    const questIgnored = ignoredQuestIds.includes(quest.id);

    if (claimedQuest) {
        return QuestStatus.Claimed;
    }

    if (checkIgnored && questIgnored && (!expiredQuest || completedQuest)) {
        return QuestStatus.Ignored;
    }

    if (completedQuest || !expiredQuest) {
        return QuestStatus.Unclaimed;
    }

    if (expiredQuest) {
        return QuestStatus.Expired;
    }

    return QuestStatus.Unknown;
}

export function countIncludedUnclaimedQuests(
    quests: Quest[],
    ignoredQuestIds: ReadonlyArray<string>,
    includedTypes: QuestIncludedTypes,
): number {
    let count = 0;

    for (const quest of quests) {
        const questStatus = getQuestStatus(quest, ignoredQuestIds);

        if (questMatchesIncludedTypes(quest, includedTypes) && questStatus === QuestStatus.Unclaimed) {
            count++;
        }
    }

    return count;
}
