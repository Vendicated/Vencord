/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SettingsStore } from "@api/Settings";
import type { Quest } from "@vencord/discord-types";
import { QuestStore } from "@webpack/common";

import { initialQuestDataFetched } from "../state";
import { processQuests, stopAutomaticAutoCompletes, stopQuestProcessing } from "../utils/completion";
import { QL } from "../utils/logging";
import { getQuestifySettings } from "./access";
import { startAutoFetchingQuests } from "./fetching";

const automationSettingKeys = ["usedKonamiCode", "autoEnrollQuests", "autoCompleteQuests", "autoEnrollQuestsUnpaused", "autoCompleteQuestsUnpaused", "allowChangingDangerousSettings", "disableQuestsEverything"] as const;
const automationStartDelayMs = 10000;
let automationActive = false;
let automationStartTimeout: ReturnType<typeof setTimeout> | null = null;

export function processAutomaticQuests(quests: readonly Quest[]): void {
    const settings = getQuestifySettings();
    const autoEnroll = settings.autoEnrollQuests && settings.autoEnrollQuestsUnpaused !== false;
    const autoComplete = settings.autoCompleteQuests && settings.autoCompleteQuestsUnpaused !== false;

    if (
        !automationActive ||
        automationStartTimeout !== null ||
        settings.usedKonamiCode !== true ||
        settings.disableQuestsEverything ||
        !settings.allowChangingDangerousSettings ||
        (!autoEnroll && !autoComplete)
    ) {
        return;
    }

    void processQuests(quests, { autoComplete, source: "auto" }).catch(error => {
        QL.error("AUTOMATIC_QUEST_PROCESSING_FAILED", { error });
    });
}

function cancelAutomaticQuestStart(): void {
    if (automationStartTimeout !== null) {
        clearTimeout(automationStartTimeout);
        automationStartTimeout = null;
        QL.info("QUEST_AUTOMATION_DEBOUNCE_CANCELLED");
    }
}

function onAutomationSettingsChanged(): void {
    stopQuestProcessing("auto");
    cancelAutomaticQuestStart();
    startAutoFetchingQuests(true);

    const settings = getQuestifySettings();
    const autoEnroll = settings.autoEnrollQuests && settings.autoEnrollQuestsUnpaused !== false;
    const autoComplete = settings.autoCompleteQuests && settings.autoCompleteQuestsUnpaused !== false;

    if (settings.usedKonamiCode !== true || !settings.allowChangingDangerousSettings || settings.autoCompleteQuestsUnpaused === false) {
        stopAutomaticAutoCompletes();
    }

    if (
        !automationActive ||
        settings.usedKonamiCode !== true ||
        settings.disableQuestsEverything ||
        !settings.allowChangingDangerousSettings ||
        (!autoEnroll && !autoComplete)
    ) {
        return;
    }

    automationStartTimeout = setTimeout(() => {
        automationStartTimeout = null;

        if (initialQuestDataFetched) {
            processAutomaticQuests(Array.from(QuestStore.quests.values()));
        }
    }, automationStartDelayMs);

    QL.info("QUEST_AUTOMATION_DEBOUNCE_STARTED", { delayMs: automationStartDelayMs, autoEnroll, autoComplete });
}

export function initializeQuestAutomation(): void {
    if (automationActive) {
        return;
    }

    automationActive = true;

    for (const key of automationSettingKeys) {
        SettingsStore.addChangeListener(`plugins.Questify.${key}`, onAutomationSettingsChanged);
    }
}

export function disposeQuestAutomation(): void {
    automationActive = false;
    cancelAutomaticQuestStart();
    stopQuestProcessing("auto");

    for (const key of automationSettingKeys) {
        SettingsStore.removeChangeListener(`plugins.Questify.${key}`, onAutomationSettingsChanged);
    }
}
