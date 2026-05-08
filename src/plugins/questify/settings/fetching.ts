/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { fetchAndAlertQuests } from "../utils/fetching";
import { QL } from "../utils/logging";
import type { Quest } from "../utils/types";
import { getCurrentUserId, getQuestifySettings } from "./access";

let autoFetchInterval: null | ReturnType<typeof setInterval> = null;
const minimumAutoFetchIntervalValue = 30 * 60; // 30 minutes
const maximumAutoFetchIntervalValue = 12 * 60 * 60; // 12 hours

export function autoFetchCompatible(): boolean {
    const settings = getQuestifySettings();
    const {
        newExcludedQuestAlertSound,
        newQuestAlertSound,
        questFetchInterval,
        notifyOnNewExcludedQuests,
        notifyOnNewQuests,
        questButtonDisplay: displayMode,
        questButtonIndicator: indicatorMode
    } = settings;
    const fetching = !settings.disableQuestsEverything && questFetchInterval > 0;
    const notificationsCompatible = notifyOnNewQuests || notifyOnNewExcludedQuests || Boolean(newQuestAlertSound) || Boolean(newExcludedQuestAlertSound);
    let buttonCompatible = false;

    if (displayMode === "always") {
        buttonCompatible = ["pill", "badge", "both"].includes(indicatorMode);
    } else if (displayMode === "unclaimed") {
        buttonCompatible = true;
    }

    const compatible = fetching && (buttonCompatible || notificationsCompatible);

    return compatible;
}

export function startAutoFetchingQuests(force: boolean = false): void {
    if (!autoFetchCompatible()) {
        stopAutoFetchingQuests();

        return;
    }

    if (autoFetchInterval) {
        if (!force) {
            return;
        }

        stopAutoFetchingQuests();
    }

    const { questFetchInterval } = getQuestifySettings();
    const interval = Math.min(Math.max(questFetchInterval, minimumAutoFetchIntervalValue), maximumAutoFetchIntervalValue);
    autoFetchInterval = setInterval(() => { void fetchAndAlertQuests("AUTO_FETCH"); }, interval * 1000);
    QL.info("START_AUTO_FETCHING_QUESTS", { autoFetchIntervalID: autoFetchInterval, questFetchInterval, questFetchIntervalClamped: interval });
}

export function stopAutoFetchingQuests(): void {
    if (autoFetchInterval) {
        clearInterval(autoFetchInterval);
        autoFetchInterval = null;
        QL.info("STOP_AUTO_FETCHING_QUESTS");
    }
}

export function resetQuestsToResume(quest?: Quest, userId?: string): void {
    const { resumeQuestIDs } = getQuestifySettings();
    const key = getCurrentUserId(userId);

    if (!key) {
        QL.warn("RESET_QUESTS_TO_RESUME_NO_USER");
        return;
    }

    const resumeState = resumeQuestIDs[key];

    if (!resumeState) {
        return;
    }

    if (!quest) {
        delete resumeQuestIDs[key];

        return;
    }

    resumeQuestIDs[key] = {
        timestamp: resumeState.timestamp,
        questIDs: resumeState.questIDs.filter(id => id !== quest.id),
    };
}
