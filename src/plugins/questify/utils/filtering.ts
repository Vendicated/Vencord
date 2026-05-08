/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type Quest, QuestRewardType, QuestTaskType } from "./types";

export type QuestIncludedTypes = Record<QuestTaskType | QuestRewardType, boolean>;

export function getNewQuests(currentQuests: Quest[], nextQuests: Quest[]): Quest[] {
    const currentQuestIds = new Set(currentQuests.map(quest => quest.id));

    return nextQuests.filter(quest => !currentQuestIds.has(quest.id));
}

export function questMatchesIncludedTypes(quest: Quest, includedTypes: QuestIncludedTypes): boolean {
    const rewardTypeAllowed = quest.config.rewardsConfig.rewards.some(reward => Boolean(includedTypes[reward.type]));
    const taskTypeAllowed = Object.values(quest.config.taskConfigV2.tasks).some(task => Boolean(includedTypes[task.type]));

    return rewardTypeAllowed && taskTypeAllowed;
}

export function normalizeQuestName(quest: Quest): string {
    const normalized = quest.config.messages.questName.trim().toUpperCase();
    return normalized.endsWith("QUEST") ? normalized.slice(0, -5).trim() : normalized;
}
