/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { Logger } from "@utils/Logger";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { FluxDispatcher, RestAPI } from "@webpack/common";

import { Quest, RGB } from "./components";

export const q = classNameFactory("questify-");
export const QuestifyLogger = new Logger("Questify");
// Only takes an audio name or URL. Plays instantly.
export const PlayAudio = findByCodeLazy("Unable to find sound for pack name:");
// Takes an audio name or URL, volume, and a callback function. Plays when play() is called.
const AudioPlayerConstructor = findByCodeLazy("sound has no duration");
export function AudioPlayer(name: string, volume: number = 1, callback?: () => void): any { return new AudioPlayerConstructor(name, null, volume, "default", callback || (() => { })); }
export const QuestsStore = findStoreLazy("QuestsStore");
export const questPath = "/discovery/quests";
export const questEndpoint = "/quests/@me";
export const leftClick = 0;
export const middleClick = 1;
export const rightClick = 2;

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
        const { body } = snakeToCamel(await RestAPI.get({ url: questEndpoint, retries: 3 }));

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

export async function enrollInQuest(quest: Quest, logger?: Logger): Promise<boolean> {
    try {
        if (!!quest.userStatus?.enrolledAt) {
            return true;
        }

        await RestAPI.post({ url: `/quests/${quest.id}/enroll`, body: { location: 11 } });
        logger?.info(`[${getFormattedNow()}] Enrolled in Quest ${quest.config.messages.questName}.`);
        return true;
    } catch (error) {
        logger?.error(`[${getFormattedNow()}] Failed to enroll in Quest ${quest.config.messages.questName}:`, error);
        return false;
    }
}

export async function reportVideoQuestProgress(quest: Quest, currentProgress: number, logger?: Logger): Promise<boolean> {
    try {
        await RestAPI.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: currentProgress } });
        logger?.info(`[${getFormattedNow()}] Quest ${quest.config.messages.questName} progress reported: ${currentProgress} seconds.`);
        return true;
    } catch (error) {
        logger?.error(`[${getFormattedNow()}] Failed to report progress for Quest ${quest.config.messages.questName}:`, error);
        return false;
    }
}

export async function reportPlayGameQuestProgress(quest: Quest, terminal: boolean, logger?: Logger): Promise<{ progress: number | null; }> {
    try {
        const response = await RestAPI.post({
            url: `/quests/${quest.id}/heartbeat`,
            body: {
                stream_key: `call:${quest.id}:1`,
                terminal
            }
        });

        const { body } = snakeToCamel(response);
        const progressPlayType = body.progress.PLAY_ON_DESKTOP || body.progress.PLAY_ON_XBOX || body.progress.PLAY_ON_PLAYSTATION || body.progress.PLAY_ACTIVITY;
        const questPlayType = quest.config.taskConfigV2?.tasks.PLAY_ON_DESKTOP || quest.config.taskConfigV2?.tasks.PLAY_ON_XBOX || quest.config.taskConfigV2?.tasks.PLAY_ON_PLAYSTATION || quest.config.taskConfigV2?.tasks.PLAY_ACTIVITY;
        const progress = progressPlayType?.value || 1;

        if (!questPlayType) {
            logger?.warn(`[${getFormattedNow()}] Quest ${quest.config.messages.questName} does not have a valid play type configured.`);
            return { progress: null };
        }

        logger?.info(`[${getFormattedNow()}] Heartbeat sent for Quest ${quest.config.messages.questName} with progress: ${progress}/${questPlayType.target}.`);
        return { progress };
    } catch (error) {
        logger?.error(`[${getFormattedNow()}] Failed to send heartbeat for Quest ${quest.config.messages.questName}:`, error);
        return { progress: null };
    }
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
