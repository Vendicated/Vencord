/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { popNotice, showNotice } from "@api/Notices";
import { showNotification } from "@api/Notifications";
import { findLazy } from "@webpack";
import { UserStore } from "@webpack/common";

import settings from "./settings";
import { PersistedQuestState, Quest, QuestsStore } from "./types";

const POLL_INTERVAL_MS = 60_000; // ~ every minute

const knownQuestIds = new Set<string>();
let pollHandle: number | null = null;
let initialised = false;

const questsKey = () => {
    const currentUser = UserStore.getCurrentUser();
    const userId = currentUser?.id ?? "unknown";
    return `quest-tracker-known-quests-${userId}`;
};

/**
 * Best-effort lookup for the internal Quests store.
 * We resolve it by behaviour (has getQuest + quests collection), not by a hard-coded store name.
 */
const questsStoreLazy = findLazy(m => {
    const store: any = m;
    if (!store) return false;

    const proto = store.__proto__ ?? Object.getPrototypeOf(store);
    const hasGetQuest =
        typeof store.getQuest === "function" ||
        typeof (proto as any)?.getQuest === "function";

    const { quests } = store;
    const hasQuests =
        quests instanceof Map ||
        Array.isArray(quests) ||
        (quests && typeof quests === "object");

    return hasGetQuest && hasQuests;
}) as QuestsStore | undefined;

function getQuestsStore(): QuestsStore | null {
    if (!questsStoreLazy) return null;
    return questsStoreLazy;
}

function isQuestActive(quest: Quest): boolean {
    if (!quest) return false;

    const now = Date.now();
    const cfg: any = quest.config ?? {};
    const startsRaw: string | undefined = cfg.startsAt;
    const expiresRaw: string | undefined = cfg.expiresAt;

    // Ignore preview-only quests
    if ((quest as any).preview) return false;

    if (startsRaw) {
        const starts = Date.parse(startsRaw);
        if (!Number.isNaN(starts) && starts > now) return false;
    }

    if (expiresRaw) {
        const expires = Date.parse(expiresRaw);
        if (!Number.isNaN(expires) && expires < now) return false;
    }

    // Completed quests are not "active" for our purposes
    if (quest.userStatus?.completedAt) return false;

    return true;
}

function getQuestGameName(quest: Quest): string | undefined {
    return quest.config?.application?.name;
}

function getQuestTitle(quest: Quest): string {
    const messages = quest.config?.messages ?? {};
    const fromMessages = messages.questName ?? messages.title ?? messages.shortDescription;

    if (typeof fromMessages === "string" && fromMessages.trim().length) {
        return fromMessages.trim();
    }

    const appName = getQuestGameName(quest);
    if (appName) return appName;

    return "New Quest";
}

/**
 * Utility: pull out all plausible reward objects from quest config.
 */
function collectRewardCandidates(cfg: any): any[] {
    const candidates: any[] = [];

    // Old guesses
    if (Array.isArray(cfg.rewards)) candidates.push(...cfg.rewards);
    if (cfg.reward) candidates.push(cfg.reward);
    if (cfg.orbReward) candidates.push(cfg.orbReward);

    // Real-world shape from your sample quest
    const rewardsConfig = cfg.rewardsConfig ?? cfg.rewardConfig ?? cfg.rewards_config;
    if (rewardsConfig) {
        if (Array.isArray(rewardsConfig.rewards)) {
            candidates.push(...rewardsConfig.rewards);
        }
        if (rewardsConfig.reward) {
            candidates.push(rewardsConfig.reward);
        }
    }

    return candidates;
}

function isOrbLikeValue(value: unknown): boolean {
    if (value == null) return false;
    const str = String(value).toUpperCase();
    return str.includes("ORB");
}

/**
 * Heuristic to detect Orb quests from reward metadata.
 * Scans rewardsConfig.rewards and any other reward-looking objects for "ORB".
 */
function isOrbQuest(quest: Quest): boolean {
    const cfg: any = quest.config ?? {};
    const candidates = collectRewardCandidates(cfg);

    for (const reward of candidates) {
        if (!reward || typeof reward !== "object") continue;

        const r: any = reward;

        // Common obvious fields first
        if (isOrbLikeValue(r.type)) return true;
        if (isOrbLikeValue(r.currency)) return true;
        if (isOrbLikeValue(r.kind)) return true;

        // Fallback: scan all keys + values for "orb"
        for (const [key, value] of Object.entries(r)) {
            if (isOrbLikeValue(key) || isOrbLikeValue(value)) return true;
        }
    }

    // Last resort: quest title explicitly mentions Orbs.
    const title = getQuestTitle(quest).toLowerCase();
    return title.includes("orb");
}

function getQuestIconUrl(quest: Quest): string | undefined {
    const app: any = quest.config?.application;
    if (!app) return;

    const { id } = app;
    const iconHash: string | undefined = app.icon ?? app.iconHash ?? app.icon_id;
    if (!id || !iconHash) return;

    // Standard Discord CDN path for application icons.
    return `https://cdn.discordapp.com/app-icons/${id}/${iconHash}.png`;
}

function shouldNotifyForQuest(isOrb: boolean): boolean {
    if (isOrb && !settings.store.notifyOrbQuests) return false;
    if (!isOrb && !settings.store.notifyNonOrbQuests) return false;
    return true;
}

function getActiveQuests(): Quest[] {
    const store = getQuestsStore();
    if (!store) return [];

    const raw: any = (store as any).quests;
    const result: Quest[] = [];

    if (!raw) return result;

    if (raw instanceof Map) {
        raw.forEach((quest: Quest) => {
            if (quest && isQuestActive(quest)) result.push(quest);
        });
    } else if (Array.isArray(raw)) {
        for (const quest of raw as Quest[]) {
            if (quest && isQuestActive(quest)) result.push(quest);
        }
    } else if (typeof raw === "object") {
        for (const value of Object.values(raw as Record<string, Quest>)) {
            const quest = value as Quest;
            if (quest && isQuestActive(quest)) result.push(quest);
        }
    }

    return result;
}

function notifyNewQuest(quest: Quest, isOrb: boolean, fromOfflineBootstrap: boolean): void {
    const questTitle = getQuestTitle(quest);
    const gameName = getQuestGameName(quest);

    const prefix = fromOfflineBootstrap ? "Quest available" : "New quest available";
    const label = isOrb ? `${prefix} (Orbs)` : prefix;

    const parts: string[] = [label + ":", questTitle];
    if (gameName) parts.push(`for ${gameName}`);
    const body = parts.join(" ");

    if (settings.store.notices) {
        showNotice(body, "OK", () => popNotice());
    }

    showNotification({
        title: "Quest Tracker",
        body,
        icon: getQuestIconUrl(quest)
        // If you discover an "open quest tab" action internally, wire onClick here.
    });
}

async function loadPersistedState(): Promise<void> {
    const currentUser = UserStore.getCurrentUser();
    if (!currentUser) return;

    const stored = (await DataStore.get(questsKey())) as PersistedQuestState | undefined;
    if (!stored?.knownQuestIds?.length) return;

    for (const id of stored.knownQuestIds) {
        knownQuestIds.add(id);
    }
}

async function persistState(): Promise<void> {
    const currentUser = UserStore.getCurrentUser();
    if (!currentUser) return;

    const state: PersistedQuestState = {
        knownQuestIds: Array.from(knownQuestIds)
    };

    await DataStore.set(questsKey(), state);
}

/**
 * Dev helper: dump current quests and one sample quest object to the console.
 * Call via:
 *   Vencord.Plugins.plugins.QuestTracker.dumpQuestsToConsole()
 */
export function debugDumpQuests(): void {
    const store = getQuestsStore();
    const quests = getActiveQuests();


    console.log("[QuestTracker] QuestsStore", store);

    console.log("[QuestTracker] Active quests", quests);
    if (quests[0]) {

        console.log("[QuestTracker] Sample quest", quests[0]);
    }
}

/**
 * One-time bootstrap:
 * - Load last known quests from DataStore.
 * - Diff against current active quests.
 * - Optionally notify about quests that appeared while the client was offline.
 */
export async function ensureInitialisedOnce(): Promise<void> {
    if (initialised) return;

    const currentUser = UserStore.getCurrentUser();
    if (!currentUser) return;

    await loadPersistedState();

    const current = getActiveQuests();

    if (settings.store.debugLogQuestsOnStartup) {
        debugDumpQuests();
    }

    if (settings.store.offlineNewQuests) {
        for (const quest of current) {
            if (knownQuestIds.has(quest.id)) continue;

            const isOrb = isOrbQuest(quest);
            if (!shouldNotifyForQuest(isOrb)) {
                knownQuestIds.add(quest.id);
                continue;
            }

            notifyNewQuest(quest, isOrb, true);
            knownQuestIds.add(quest.id);
        }
    } else {
        for (const quest of current) {
            knownQuestIds.add(quest.id);
        }
    }

    await persistState();
    initialised = true;
}

/**
 * Called on every poll tick while the plugin is active.
 * Detects quests that have appeared since the last tick and notifies.
 */
export async function checkForNewQuestsTick(): Promise<void> {
    const currentUser = UserStore.getCurrentUser();
    if (!currentUser) return;

    await ensureInitialisedOnce();

    const current = getActiveQuests();
    const newlyObserved: Quest[] = [];

    for (const quest of current) {
        if (knownQuestIds.has(quest.id)) continue;
        newlyObserved.push(quest);
        knownQuestIds.add(quest.id);
    }

    if (!newlyObserved.length) return;

    for (const quest of newlyObserved) {
        const isOrb = isOrbQuest(quest);
        if (!shouldNotifyForQuest(isOrb)) continue;
        notifyNewQuest(quest, isOrb, false);
    }

    await persistState();
}

export function startQuestWatcher(): void {
    if (pollHandle != null) return;

    pollHandle = window.setInterval(() => {
        void checkForNewQuestsTick();
    }, POLL_INTERVAL_MS);
}

export function stopQuestWatcher(): void {
    if (pollHandle == null) return;

    clearInterval(pollHandle);
    pollHandle = null;
}
