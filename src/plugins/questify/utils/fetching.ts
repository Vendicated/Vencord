/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { sleep } from "@utils/misc";
import type { PluginNative } from "@utils/types";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { RestAPI } from "@webpack/common";
import { NavigationRouter } from "@webpack/common/utils";

import { getQuestifySettings } from "../settings/access";
import { questIsIgnored } from "../settings/ignoredQuests";
import { AudioPlayer } from "./audio";
import { getNewQuests, normalizeQuestName, type QuestIncludedTypes, questMatchesIncludedTypes } from "./filtering";
import { QL } from "./logging";
import { type Quest, QuestStore } from "./types";
import { QUEST_PAGE } from "./ui";

export const AuthorizedAppsStore = findStoreLazy("AuthorizedAppsStore");
const QuestifyNative = VencordNative?.pluginHelpers?.Questify as PluginNative<typeof import("../native")> | undefined;

export function snakeToCamel(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(snakeToCamel);
    }

    if (obj && typeof obj === "object") {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
                key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
                snakeToCamel(value),
            ]),
        );
    }

    return obj;
}

export const fetchAndDispatchQuests = findByCodeLazy("QUESTS_FETCH_CURRENT_QUESTS_BEGIN");
const parseQuestConfig = findByCodeLazy("config).with({config_version:");
const formatQuestData = findByCodeLazy("config),userStatus:null==");

async function fetchQuestById(questId: string): Promise<Quest | null> {
    try {
        const { body } = await RestAPI.get({ url: `/quests/${questId}`, retries: 3 });
        const valid = !!parseQuestConfig({ config: body });

        if (!valid) {
            QL.warn("FETCH_QUEST_BY_ID_INVALID_BODY", { questId, body });

            return null;
        }

        return formatQuestData(body);
    } catch (error: unknown) {
        QL.warn("FETCH_QUEST_BY_ID_FAILED", { questId, error });

        return null;
    }
}

async function fetchExcludedQuestConfigs(questIds: string[]): Promise<Quest[]> {
    const quests: Quest[] = [];

    for (const [index, questId] of questIds.entries()) {
        if (index > 0) {
            await sleep(1000);
        }

        const quest = await fetchQuestById(questId);

        if (quest) {
            quests.push(quest);
        }
    }

    return quests;
}

export function canOpenDevToolsWindow(): boolean {
    return typeof QuestifyNative?.canOpenDevTools === "function"
        && typeof QuestifyNative?.openDevTools === "function";
}

export async function openDevToolsWindow(): Promise<boolean> {
    if (!canOpenDevToolsWindow()) {
        return false;
    }

    const native = QuestifyNative!;

    return await native.canOpenDevTools()
        ? native.openDevTools()
        : false;
}

function getQuestNotificationText(quests: Quest[], excluded: boolean): { title: string; body: string; } {
    const firstQuest = quests[0];
    const firstQuestName = normalizeQuestName(firstQuest);

    if (quests.length === 1) {
        return {
            title: excluded ? "New Excluded Quest Detected!" : "New Quest Detected!",
            body: excluded
                ? `The excluded ${firstQuestName} Quest was detected. ID: ${firstQuest.id}`
                : `The ${firstQuestName} Quest is now available.`
        };
    }

    return {
        title: excluded ? "New Excluded Quests Detected!" : "New Quests Detected!",
        body: excluded
            ? `${quests.length} new excluded Quests were detected. Check the console for their Quest IDs.`
            : `${quests.length} new Quests are now available.`
    };
}

function notifyNewQuests(quests: Quest[], excluded: boolean): void {
    if (quests.length === 0) return;

    const firstQuest = quests[0];
    const { title, body } = getQuestNotificationText(quests, excluded);
    const onClick = excluded
        ? canOpenDevToolsWindow() ? openDevToolsWindow : undefined
        : () => NavigationRouter.transitionTo(`${QUEST_PAGE}#${firstQuest.id}`);

    showNotification({
        title,
        body,
        dismissOnClick: true,
        onClick
    });

    QL.log("NOTIFY_NEW_QUESTS", { excluded, quests });
}

export async function fetchAndAlertQuests(source: string): Promise<Quest[] | null> {
    const settings = getQuestifySettings();
    const alertSound = settings.newQuestAlertSound;
    const alertVolume = settings.newQuestAlertVolume;
    const excludedAlertSound = settings.newExcludedQuestAlertSound;
    const excludedAlertVolume = settings.newExcludedQuestAlertVolume;
    const shouldFetchExcludedQuests = settings.notifyOnNewExcludedQuests || Boolean(excludedAlertSound);
    const currentQuests = Array.from(QuestStore.quests.values());
    const currentExcludedQuestIds = new Set(Array.from(QuestStore.excludedQuests.values()).map(quest => quest.id));
    const includedTypes = settings.questButtonIncludedTypes as QuestIncludedTypes;

    await fetchAndDispatchQuests();
    await sleep(1000);

    const nextQuests = Array.from(QuestStore.quests.values());

    if (!nextQuests || currentQuests.length === 0) {
        return nextQuests;
    }

    const newQuests = getNewQuests(currentQuests, nextQuests);
    const newExcludedQuestIds = shouldFetchExcludedQuests
        ? Array.from(QuestStore.excludedQuests.values())
            .map(quest => quest.id)
            .filter(questId => !currentExcludedQuestIds.has(questId))
        : [];

    if (newQuests.length === 0 && newExcludedQuestIds.length === 0) {
        return nextQuests;
    }

    const newExcludedQuests = newExcludedQuestIds.length > 0 ? await fetchExcludedQuestConfigs(newExcludedQuestIds) : [];
    const newIncludedQuests = newQuests.filter(quest => questMatchesIncludedTypes(quest, includedTypes) && !questIsIgnored(quest.id));
    const newIncludedExcludedQuests = newExcludedQuests.filter(quest => questMatchesIncludedTypes(quest, includedTypes) && !questIsIgnored(quest.id));
    const shouldAlert = Boolean(alertSound) && newIncludedQuests.length > 0;
    const shouldAlertExcluded = Boolean(excludedAlertSound) && newIncludedExcludedQuests.length > 0;
    const shouldNotify = settings.notifyOnNewQuests && newIncludedQuests.length > 0;
    const shouldNotifyExcluded = settings.notifyOnNewExcludedQuests && newIncludedExcludedQuests.length > 0;

    QL.info("FETCH_AND_ALERT_QUESTS_NEW_QUESTS", {
        source,
        newQuestCount: newQuests.length,
        newQuests: newIncludedQuests,
        matchedQuestCount: newIncludedQuests.length + newIncludedExcludedQuests.length,
        ...(shouldFetchExcludedQuests ? {
            newExcludedQuestCount: newExcludedQuestIds.length,
            newExcludedQuests: newIncludedExcludedQuests,
            matchedExcludedQuestCount: newIncludedExcludedQuests.length,
        } : {}),
        shouldAlert,
        shouldAlertExcluded,
        shouldNotify,
        shouldNotifyExcluded,
    });

    if (shouldAlert) {
        AudioPlayer(alertSound!, Math.max(0, Math.min(100, alertVolume)) / 100).play();
    }

    if (shouldAlertExcluded) {
        AudioPlayer(excludedAlertSound!, Math.max(0, Math.min(100, excludedAlertVolume)) / 100).play();
    }

    if (shouldNotify) {
        notifyNewQuests(newIncludedQuests, false);
    }

    if (shouldNotifyExcluded) {
        notifyNewQuests(newIncludedExcludedQuests, true);
    }

    return nextQuests;
}
