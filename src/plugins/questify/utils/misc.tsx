/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { Logger } from "@utils/Logger";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { FluxDispatcher, RestAPI, UserStore } from "@webpack/common";

import { activeQuestIntervals } from "..";
import { questIsIgnored, settings } from "../settings";
import { Quest, QuestStatus, QuestTask, QuestTaskType, RGB } from "./components";

export const q = classNameFactory("questify-");
export const QuestifyLogger = new Logger("Questify");
const AudioPlayerConstructor = findByCodeLazy("sound has no duration");
export function AudioPlayer(name: string, volume: number = 1, callback?: () => void): any { return new AudioPlayerConstructor(name, null, volume, "default", callback ?? (() => { })); }
export const QuestsStore = findByPropsLazy("claimedQuests");
export const reportProgress = findByCodeLazy(".QUESTS_VIDEO_PROGRESS(");
export const sendHeartbeat = findByCodeLazy(".QUESTS_HEARTBEAT(");
export const questPath = "/quest-home";
export const videoQuestLeeway = 24;
export const leftClick = 0;
export const middleClick = 1;
export const rightClick = 2;

type HeartbeatDispatchResult =
    | { type: "success"; userStatus: Quest["userStatus"]; }
    | { type: "failure"; error: unknown; }
    | { type: "timeout"; };

export function setIgnoredQuestIDs(questIDs: string[], userId?: string): void {
    const currentUserID = userId ?? UserStore.getCurrentUser()?.id;
    if (!currentUserID) return;
    const { ignoredQuestProfile } = settings.store;
    const key = ignoredQuestProfile === "shared" ? "shared" : currentUserID;
    settings.store.ignoredQuestIDs[key] = questIDs;
}

export function getIgnoredQuestIDs(userId?: string): string[] {
    const currentUserID = userId ?? UserStore.getCurrentUser()?.id;
    if (!currentUserID) return [];
    const { ignoredQuestIDs, ignoredQuestProfile } = settings.store;
    const key = ignoredQuestProfile === "shared" ? "shared" : currentUserID;
    ignoredQuestIDs[key] ??= [];
    return ignoredQuestIDs[key];
}

export function getQuestTask(quest: Quest): QuestTask {
    const tasks = quest.config.taskConfigV2?.tasks;

    return (tasks.PLAY_ON_DESKTOP ||
        tasks.PLAY_ON_XBOX ||
        tasks.PLAY_ON_PLAYSTATION ||
        tasks.PLAY_ACTIVITY ||
        tasks.WATCH_VIDEO ||
        tasks.WATCH_VIDEO_ON_MOBILE ||
        tasks.ACHIEVEMENT_IN_ACTIVITY) as QuestTask;
}

export function getQuestProgress(quest: Quest, task: QuestTask) {
    const intervalData = activeQuestIntervals.get(quest.id);

    if (intervalData) { return intervalData.progress; }

    const progressMap = quest.userStatus?.progress;

    if (!progressMap) { return null; }

    if (task.type === QuestTaskType.WATCH_VIDEO || task.type === QuestTaskType.WATCH_VIDEO_ON_MOBILE) {
        const watchProgress = progressMap.WATCH_VIDEO?.value;
        const mobileProgress = progressMap.WATCH_VIDEO_ON_MOBILE?.value;

        if (watchProgress !== undefined || mobileProgress !== undefined) {
            return Math.max(watchProgress ?? 0, mobileProgress ?? 0);
        }

        return null;
    }

    return progressMap[task.type]?.value ?? null;
}

export function getQuestTarget(task: QuestTask) {
    const isWatch = task.type === QuestTaskType.WATCH_VIDEO || task.type === QuestTaskType.WATCH_VIDEO_ON_MOBILE;
    const { completeVideoQuestsQuicker } = settings.store;
    const raw = task.target;
    const adjusted = Math.max(0, raw - (isWatch && completeVideoQuestsQuicker ? videoQuestLeeway : 0));
    return { raw, adjusted };
}

export function getQuestStatus(quest: Quest, checkIgnored: boolean = true): QuestStatus {
    const completedQuest = quest.userStatus?.completedAt;
    const claimedQuest = quest.userStatus?.claimedAt;
    const expiredQuest = new Date(quest.config.expiresAt) < new Date();
    const questIgnored = questIsIgnored(quest.id);

    if (claimedQuest) {
        return QuestStatus.Claimed;
    } else if (checkIgnored && questIgnored && (!expiredQuest || completedQuest)) {
        return QuestStatus.Ignored;
    } else if (completedQuest || !expiredQuest) {
        return QuestStatus.Unclaimed;
    } else if (expiredQuest) {
        return QuestStatus.Expired;
    }

    return QuestStatus.Unknown;
}

export function refreshQuest(quest: Quest): Quest {
    return QuestsStore.getQuest(quest.id) as Quest ?? quest;
}

export function isSoundAllowed(url: string): Promise<boolean> {
    return VencordNative.csp.isDomainAllowed(url, ["img-src"]);
}

export function snakeToCamel(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(snakeToCamel);
    } else if (obj && typeof obj === "object") {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
                key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
                snakeToCamel(value)
            ])
        );
    }

    return obj;
}

export function getFormattedNow(): string {
    return new Date().toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    }).replace(",", "");
}

export function decimalToRGB(decimal: number): RGB {
    const r = (decimal >> 16) & 0xFF;
    const g = (decimal >> 8) & 0xFF;
    const b = decimal & 0xFF;
    return { r, g, b };
}

export function adjustRGB(rgb: RGB, shift: number): RGB {
    const color = { ...rgb };

    color.r = Math.max(0, Math.min(255, color.r + shift));
    color.g = Math.max(0, Math.min(255, color.g + shift));
    color.b = Math.max(0, Math.min(255, color.b + shift));

    return color;
}

export function isDarkish(rgb: RGB, threshold: number = 0.5): boolean {
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < threshold;
}

export function validCommaSeparatedList(
    value: string,
    allowedTerms: string[] = [],
    allowEmpty: boolean = true,
    mustIncludeAll: boolean = false,
    noDuplicates: boolean = true,
    caseSensitive: boolean = false
): boolean {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
        return allowEmpty;
    }

    function normalize(str: string): string {
        return caseSensitive ? str.trim() : str.trim().toLowerCase();
    }

    const allowed = new Set(allowedTerms.map(term => normalize(term)));
    const seen = new Set<string>();

    for (let term of trimmedValue.split(",")) {
        term = normalize(term);

        if (!term || !allowed.has(term)) {
            return false;
        }

        if (noDuplicates && seen.has(term)) {
            return false;
        }

        seen.add(term);
    }

    return !mustIncludeAll || (allowed.size === seen.size);
}

export function normalizeQuestName(name: string): string {
    const normalized = name.trim().toUpperCase();
    return normalized.endsWith("QUEST") ? normalized.slice(0, -5).trim() : normalized;
}

export async function fetchAndDispatchQuests(source?: string, logger?: Logger): Promise<Quest[] | null> {
    try {
        const { body } = snakeToCamel(await RestAPI.get({ url: "/quests/@me", retries: 3 }));

        FluxDispatcher.dispatch({
            type: "QUESTS_FETCH_CURRENT_QUESTS_SUCCESS",
            excludedQuests: body.excludedQuests,
            questEnrollmentBlockedUntil: body.questEnrollmentBlockedUntil,
            quests: body.quests,
            ...(source !== undefined && { source }),
        });

        return body.quests;
    } catch (e) {
        logger?.warn(`[${getFormattedNow()}] Failed to fetch and dispatch Quests:`, e);
        return null;
    }
}

export async function waitUntilEnrolled(quest: Quest, timeout: number = 30000, interval: number = 500, logger?: Logger): Promise<boolean> {
    const questName = normalizeQuestName(quest.config.messages.questName);
    const start = Date.now();

    if (quest.userStatus?.enrolledAt) {
        logger?.info(`[${getFormattedNow()}] Quest ${questName} is already enrolled.`);
        return true;
    } else if (quest.userStatus?.completedAt) {
        logger?.warn(`[${getFormattedNow()}] Cannot enroll in completed Quest ${questName}.`);
        return false;
    } else {
        logger?.info(`[${getFormattedNow()}] Waiting for enrollment in Quest ${questName}...`);
    }

    while (!quest.userStatus?.enrolledAt && (Date.now() - start) < timeout) {
        await new Promise(resolve => setTimeout(resolve, interval));
        quest = refreshQuest(quest);
    }

    if (quest.userStatus?.enrolledAt) {
        logger?.info(`[${getFormattedNow()}] Successfully waited for enrollment in Quest ${questName}.`);
        return true;
    } else {
        logger?.warn(`[${getFormattedNow()}] Timeout waiting for enrollment in Quest ${questName}.`);
        return false;
    }
}

export async function reportVideoQuestProgress(quest: Quest, currentProgress: number, logger?: Logger, options?: { attempts?: number, delay?: number; }): Promise<boolean> {
    const questName = normalizeQuestName(quest.config.messages.questName);

    if (!quest.userStatus?.enrolledAt) {
        logger?.warn(`[${getFormattedNow()}] Cannot report progress for unenrolled Quest ${questName}.`);
        return false;
    } else if (quest.userStatus?.completedAt) {
        return true;
    }

    const maxAttempts = options?.attempts ?? 1;
    const delay = options?.delay ?? 2500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await reportProgress(quest.id, currentProgress);

            logger?.info(`[${getFormattedNow()}] Quest ${questName} progress reported: ${currentProgress.toFixed(6)} seconds.`);
            return true;
        } catch (error) {
            logger?.error(`[${getFormattedNow()}] Failed to report progress for Quest ${questName} on attempt ${attempt}/${maxAttempts}:`, error);

            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    logger?.warn(`[${getFormattedNow()}] Exhausted all ${maxAttempts} attempts to report progress for Quest ${questName}.`);
    return false;
}

function getPlayGameProgressValue(userStatus: Quest["userStatus"]): number | null {
    const progressMap = userStatus?.progress;

    if (!progressMap) {
        return null;
    }

    const progressPlayType = progressMap.PLAY_ON_DESKTOP?.value
        ?? progressMap.PLAY_ON_XBOX?.value
        ?? progressMap.PLAY_ON_PLAYSTATION?.value
        ?? progressMap.PLAY_ACTIVITY?.value;

    return progressPlayType ?? null;
}

function waitForHeartbeatDispatchResult(questId: string, timeoutMs: number): Promise<HeartbeatDispatchResult> {
    return new Promise(resolve => {
        const successEvent = "QUESTS_SEND_HEARTBEAT_SUCCESS";
        const failureEvent = "QUESTS_SEND_HEARTBEAT_FAILURE";
        const timeoutId = setTimeout(() => {
            cleanup();
            resolve({ type: "timeout" });
        }, timeoutMs);

        function cleanup() {
            clearTimeout(timeoutId);
            FluxDispatcher.unsubscribe(successEvent, onSuccess);
            FluxDispatcher.unsubscribe(failureEvent, onFailure);
        }

        function onSuccess(data: { questId?: string; userStatus?: Quest["userStatus"]; }) {
            if (data.questId !== questId) {
                return;
            }

            cleanup();
            resolve({ type: "success", userStatus: data.userStatus ?? null });
        }

        function onFailure(data: { questId?: string; error?: unknown; }) {
            if (data.questId !== questId) {
                return;
            }

            cleanup();
            resolve({ type: "failure", error: data.error });
        }

        FluxDispatcher.subscribe(successEvent, onSuccess);
        FluxDispatcher.subscribe(failureEvent, onFailure);
    });
}

export async function reportPlayGameQuestProgress(quest: Quest, terminal: boolean, logger?: Logger, options?: { attempts?: number, delay?: number; timeout?: number; applicationId?: string; streamKey?: string; }): Promise<{ progress: number | null; completed: boolean; }> {
    const questName = normalizeQuestName(quest.config.messages.questName);

    if (!quest.userStatus?.enrolledAt) {
        logger?.warn(`[${getFormattedNow()}] Cannot send heartbeat for unenrolled Quest ${questName}.`);
        return { progress: null, completed: false };
    } else if (quest.userStatus?.completedAt && !terminal) {
        return { progress: null, completed: true };
    }

    const maxAttempts = options?.attempts ?? 1;
    const delay = options?.delay ?? 2500;
    const timeout = options?.timeout ?? 10000;
    const streamKey = options?.streamKey;
    const applicationId = options?.applicationId ?? quest.config.application.id;
    const questPlayType = quest.config.taskConfigV2?.tasks.PLAY_ON_DESKTOP || quest.config.taskConfigV2?.tasks.PLAY_ON_XBOX || quest.config.taskConfigV2?.tasks.PLAY_ON_PLAYSTATION || quest.config.taskConfigV2?.tasks.PLAY_ACTIVITY;

    if (!questPlayType) {
        logger?.warn(`[${getFormattedNow()}] Could not recognize the Quest type for Quest ${questName}.`);
        return { progress: null, completed: false };
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const dispatchResultPromise = waitForHeartbeatDispatchResult(quest.id, timeout);

            await sendHeartbeat({
                questId: quest.id,
                streamKey,
                applicationId,
                terminal,
            });

            const dispatchResult = await dispatchResultPromise;

            if (dispatchResult.type === "failure") {
                logger?.error(`[${getFormattedNow()}] Failed to send heartbeat for Quest ${questName} on attempt ${attempt}/${maxAttempts}:`, dispatchResult.error);

                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                continue;
            }

            if (dispatchResult.type === "timeout") {
                logger?.warn(`[${getFormattedNow()}] Timed out waiting for heartbeat dispatch for Quest ${questName} on attempt ${attempt}/${maxAttempts}.`);

                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                continue;
            }

            const updatedQuest = refreshQuest(quest);
            const progress = getPlayGameProgressValue(dispatchResult.userStatus) ?? getQuestProgress(updatedQuest, questPlayType) ?? 0;
            const completed = !!dispatchResult.userStatus?.completedAt || !!updatedQuest.userStatus?.completedAt;

            logger?.info(`[${getFormattedNow()}] Heartbeat sent for Quest ${questName} with progress: ${progress}/${questPlayType.target}.`);
            return { progress, completed };
        } catch (error) {
            logger?.error(`[${getFormattedNow()}] Failed to send heartbeat for Quest ${questName} on attempt ${attempt}/${maxAttempts}:`, error);

            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    logger?.warn(`[${getFormattedNow()}] Exhausted all ${maxAttempts} attempts to send heartbeat for Quest ${questName}.`);
    return { progress: null, completed: false };
}

export function getBadgeSize(value: string, negative: boolean): number {
    const numChars = value.length;
    const subtract = negative ? 3 : 0;

    if (numChars === 1) {
        return 16;
    } else if (numChars === 2) {
        return 21;
    } else {
        return (21 + (numChars - 2) * 8) - subtract;
    }
}

export function formatLowerBadge(value: number, maxDigits: number = 4): [string, number] {
    const isNegative = value < 0;
    const absValue = Math.abs(value);

    if (maxDigits <= 0) {
        const str = isNegative ? `-${absValue}` : `${absValue}`;
        return [str, getBadgeSize(str, isNegative)];
    }

    const absStr = String(absValue);
    const numDigits = absStr.length;

    if (numDigits <= maxDigits) {
        const str = isNegative ? `-${absValue}` : `${absValue}`;
        return [str, getBadgeSize(str, isNegative)];
    }

    if (absValue < 1000) {
        if (maxDigits === 1) {
            if (absValue < 100) {
                const str = isNegative ? "<-9" : "9+";
                return [str, getBadgeSize(str, isNegative)];
            } else {
                const str = isNegative ? "<-99" : "99+";
                return [str, getBadgeSize(str, isNegative)];
            }
        } else if (maxDigits === 2) {
            const str = isNegative ? "<-99" : "99+";
            return [str, getBadgeSize(str, isNegative)];
        }
    }

    let num = absValue;
    const units = ["K", "M", "B"];
    let unit = "";

    for (let i = 0; i < units.length; i++) {
        const nextValue = Math.floor(num / 1000);

        if (nextValue === 0) {
            break;
        }

        if (i === units.length - 1 && nextValue >= 1000) {
            num = 999;
            unit = units[i];
            break;
        }

        num = nextValue;
        unit = units[i];
    }

    if (isNegative) {
        const str = `<-${num}${unit}`;
        return [str, getBadgeSize(str, true)];
    } else {
        const str = `${num}${unit}+`;
        return [str, getBadgeSize(str, false)];
    }
}
