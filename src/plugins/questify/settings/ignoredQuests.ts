/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { QuestIncludedTypes } from "../utils/filtering";
import { countIncludedUnclaimedQuests, getQuestStatus, QuestStatus } from "../utils/questState";
import { type Quest, QuestStore } from "../utils/types";
import { getQuestifySettings } from "./access";
import { ignoredQuestIDsKey } from "./def";
import { rerenderQuests } from "./rerender";

function validateQuestBadgeCount(): void {
    const settings = getQuestifySettings();
    const questButtonIncludedTypes = settings.questButtonIncludedTypes as QuestIncludedTypes;
    const quests = Array.from(QuestStore.quests.values());
    const ignoredQuestIds = getIgnoredQuestIDs();
    const count = countIncludedUnclaimedQuests(quests, ignoredQuestIds, questButtonIncludedTypes);

    settings.questButtonBadgeCount = count;
}

export function getIgnoredQuestIDs(): string[] {
    const { ignoredQuestIDs } = getQuestifySettings();
    const ignoredQuestIDsForKey = Array.from(ignoredQuestIDs[ignoredQuestIDsKey] ?? []);
    return ignoredQuestIDsForKey;
}

function setIgnoredQuestIDs(questIDs: string[]): void {
    getQuestifySettings().ignoredQuestIDs[ignoredQuestIDsKey] = questIDs;
}

export function validateIgnoredQuests(qs?: Quest[]): void {
    const currentlyIgnoredQuests = getIgnoredQuestIDs();
    const quests = qs ?? Array.from(QuestStore.quests.values());
    const excludedQuests = Array.from(QuestStore.excludedQuests.values());
    const validIgnored = Array.from(new Set<string>(currentlyIgnoredQuests.filter(id => quests.some(quest => quest.id === id) || excludedQuests.some(quest => quest.id === id))));

    setIgnoredQuestIDs(validIgnored);
    validateQuestBadgeCount();
    rerenderQuests();
}

export function resetIgnoredQuests(): void {
    setIgnoredQuestIDs([]);
    validateIgnoredQuests();
}

export function addIgnoredQuest(questId: string): void {
    setIgnoredQuestIDs(Array.from(new Set([...getIgnoredQuestIDs(), questId])));
    validateIgnoredQuests();
}

export function removeIgnoredQuest(questId: string): void {
    setIgnoredQuestIDs(getIgnoredQuestIDs().filter(id => id !== questId));
    validateIgnoredQuests();
}

export function questIsIgnored(questId: string): boolean {
    return getIgnoredQuestIDs().includes(questId);
}

export function ignoreAllQuests(): void {
    const currentlyIgnored = new Set(getIgnoredQuestIDs());
    const ignoredQuests = new Set<string>();

    for (const quest of QuestStore.quests.values()) {
        if (
            currentlyIgnored.has(quest.id)
            || getQuestStatus(quest, Array.from(currentlyIgnored), false) === QuestStatus.Unclaimed
        ) {
            ignoredQuests.add(quest.id);
        }
    }

    for (const quest of QuestStore.excludedQuests.values()) {
        if (currentlyIgnored.has(quest.id)) {
            ignoredQuests.add(quest.id);
        }
    }

    setIgnoredQuestIDs(Array.from(ignoredQuests));
    validateIgnoredQuests();
}
