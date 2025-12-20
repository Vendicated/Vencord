/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { QuestSpooferLogger, QuestTasks, randomPid } from "@plugins/questSpoofer/constants";
import { fetchQuests } from "@plugins/questSpoofer/helpers";
import { spoofDesktopPlayQuest } from "@plugins/questSpoofer/tasks/desktopPlay";
import { spoofPlayActivityQuest } from "@plugins/questSpoofer/tasks/playActivity";
import { spoofStreamDesktopQuest } from "@plugins/questSpoofer/tasks/streamDesktop";
import { spoofVideoQuest } from "@plugins/questSpoofer/tasks/video";
import { showToast, Toasts } from "@webpack/common";

export type QuestTask = typeof QuestTasks[number];

interface QuestProgress {
    progress?: Record<string, { value: number }>;
    streamProgressSeconds?: number;
    enrolledAt?: string;
    enrolled_at?: string;
}

interface QuestConfig {
    application: { id: string; name: string };
    messages: { game_title?: string; questName?: string };
    taskConfig?: { tasks: Record<string, { target: number }> };
    task_config_v2?: { tasks: Record<string, { target: number }> };
}

export interface Quest {
    id: string;
    config: QuestConfig;
    user_status?: QuestProgress;
    userStatus?: QuestProgress;
}

interface RunOptions {
    silentIfNone?: boolean;
    silent?: boolean;
    skipSeen?: boolean;
}

let isRunning = false;
const AUTO_POLL_MS = 60_000;
let autoPoll: ReturnType<typeof setInterval> | null = null;
const processedQuestIds = new Set<string>();

/** Determines which task config block is present on the quest. */
function getTaskConfig(quest: Quest) {
    return quest.config.taskConfig ?? quest.config.task_config_v2;
}

/** Finds the first supported quest task defined in the quest config. */
function getQuestTask(taskConfig?: { tasks: Record<string, unknown> }): QuestTask | undefined {
    return QuestTasks.find(t => taskConfig?.tasks?.[t]) as QuestTask | undefined;
}

/** Resolves quest progress across both camelCase and snake_case structures. */
function getSecondsDone(quest: Quest, task: QuestTask) {
    return quest.user_status?.progress?.[task]?.value
        ?? quest.userStatus?.progress?.[task]?.value
        ?? 0;
}

/** Dispatches the specific quest spoofer based on the task type. */
async function spoofQuestByTask(
    quest: Quest,
    task: QuestTask,
    appId: string,
    appName: string,
    pid: number,
    secondsNeeded: number,
    secondsDone: number,
) {
    if (task === "WATCH_VIDEO" || task === "WATCH_VIDEO_ON_MOBILE") {
        await spoofVideoQuest(quest, secondsNeeded, secondsDone);
    } else if (task === "PLAY_ON_DESKTOP") {
        await spoofDesktopPlayQuest(quest, appId, appName, pid, secondsNeeded);
    } else if (task === "STREAM_ON_DESKTOP") {
        spoofStreamDesktopQuest(quest, appId, appName, pid, secondsNeeded);
    } else if (task === "PLAY_ACTIVITY") {
        await spoofPlayActivityQuest(quest, secondsNeeded);
    } else {
        QuestSpooferLogger.warn(`Unsupported quest task: ${task}`);
    }
}

/** Main entry for fetching quests and dispatching spoofers for each supported task. */
export async function runQuestSpoofer(options?: RunOptions) {
    if (isRunning) {
        if (!options?.silent) {
            showToast("Quest Spoofer is already running.", Toasts.Type.MESSAGE);
        }
        return;
    }

    isRunning = true;

    try {
        delete (window as any).$;

        const quests = await fetchQuests();
        const questsToProcess = options?.skipSeen
            ? quests.filter(q => !processedQuestIds.has(q.id))
            : quests;

        if (questsToProcess.length === 0) {
            QuestSpooferLogger.warn(
                quests.length === 0
                    ? "No uncompleted quests found from API."
                    : "No new unprocessed quests to spoof.",
            );
            if (!options?.silentIfNone) {
                showToast(
                    quests.length === 0
                        ? "No uncompleted quest found."
                        : "No new quests to spoof.",
                    Toasts.Type.MESSAGE,
                );
            }
            return;
        }

        QuestSpooferLogger.log(
            `Detected ${questsToProcess.length} quest(s) to spoof.`,
        );

        for (const quest of questsToProcess) {
            const questName =
                quest.config.messages.game_title ??
                quest.config.messages.questName ??
                quest.config.application.name;

            QuestSpooferLogger.log(
                `Detected quest: ${quest.config.application.name} - ${questName}`,
            );
            processedQuestIds.add(quest.id);

            const pid = randomPid();
            const appId = quest.config.application.id;
            const appName = quest.config.application.name;

            const taskConfig = getTaskConfig(quest);
            const task = getQuestTask(taskConfig);

            if (!taskConfig) {
                QuestSpooferLogger.warn(
                    `No task config found for ${appName}; skipping quest.`,
                );
                continue;
            }

            if (!task) {
                QuestSpooferLogger.warn(
                    `No valid quest task found in config for ${appName}.`,
                );
                continue;
            }

            const secondsNeeded = taskConfig.tasks[task].target;
            const secondsDone = getSecondsDone(quest, task);

            QuestSpooferLogger.info(
                `Spoofing task: ${task} | Needed: ${secondsNeeded}s | Done: ${secondsDone}s`,
            );

            try {
                await spoofQuestByTask(
                    quest,
                    task,
                    appId,
                    appName,
                    pid,
                    secondsNeeded,
                    secondsDone,
                );
            } catch (err) {
                QuestSpooferLogger.error(
                    `Failed to spoof quest ${appName}:`,
                    err,
                );
            }
        }

        showToast(
            `Finished spoofing ${quests.length} quest(s).`,
            Toasts.Type.MESSAGE,
        );
    } finally {
        isRunning = false;
    }
}

/** Starts silent polling that auto-spoofs new quests. */
export function startAutoQuestListener() {
    if (autoPoll) return false;

    autoPoll = setInterval(() => {
        void runQuestSpoofer({ silentIfNone: true, silent: true, skipSeen: true });
    }, AUTO_POLL_MS);

    return true;
}

/** Stops the auto-polling quest listener. */
export function stopAutoQuestListener() {
    if (!autoPoll) return false;

    clearInterval(autoPoll);
    autoPoll = null;
    return true;
}

/** Whether the auto listener is currently running. */
export function isAutoQuestListenerActive() {
    return !!autoPoll;
}

/** Clears the set of quests already processed in auto mode. */
export function resetProcessedQuestCache() {
    processedQuestIds.clear();
}

/** Testing helper to reset processed quests. */
export function _resetProcessedQuestsForTesting() {
    resetProcessedQuestCache();
}
