/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { findByPropsLazy } from "@webpack";
import {
    RelationshipStore,
    UserStore,
    VoiceStateStore
} from "@webpack/common";
import {
    AFFINITY_WEIGHT,
    DM_COOLDOWN_MS,
    DM_POINTS,
    DM_WEIGHT,
    HALF_LIFE_MS,
    KEEP_TOP_ENTRIES,
    MIN_SCORE_THRESHOLD,
    STORE_KEY_PREFIX,
    VC_POINTS,
    VC_WEIGHT
} from "./constants";
import settings from "./settings";
import type { FrequencyData } from "./types";

const UserAffinitiesStore = findByPropsLazy("getUserAffinities");

export let frequencyCache: Record<string, FrequencyData> = Object.create(null);
export let lastBackup: Record<string, FrequencyData> | null = null;
let voiceScoreInterval: ReturnType<typeof setInterval> | null = null;
// Global lock to prevent a race between _initVoiceState and onVoiceStateUpdate
// both calling startVoiceScoring() before the first interval is fully registered.
let voiceScoringActive = false;
export let currentVoiceChannelId: string | null = null;
let saveDebounce: ReturnType<typeof setTimeout> | null = null;
let currentStoreKey: string = STORE_KEY_PREFIX + "default";

const scoreListeners = new Set<() => void>();
export function subscribeToScoreChanges(fn: () => void): () => void {
    scoreListeners.add(fn);
    return () => scoreListeners.delete(fn);
}
function notifyScoreListeners() { for (const fn of scoreListeners) fn(); }

const backupListeners = new Set<() => void>();
export function subscribeToBackupChanges(fn: () => void): () => void {
    backupListeners.add(fn);
    return () => backupListeners.delete(fn);
}
function notifyBackupListeners() { for (const fn of backupListeners) fn(); }

export function setFrequencyCache(cache: Record<string, FrequencyData>) {
    frequencyCache = cache;
    notifyScoreListeners();
}
export function setLastBackup(backup: Record<string, FrequencyData> | null) {
    lastBackup = backup;
    notifyBackupListeners();
}
export function setCurrentVoiceChannelId(id: string | null) { currentVoiceChannelId = id; }

function isSafeUserId(userId: unknown): userId is string {
    if (!userId || typeof userId !== "string") return false;
    if (userId === "__proto__" || userId === "constructor" || userId === "prototype") return false;
    return true;
}

export function expDecay(elapsedMs: number): number {
    if (elapsedMs <= 0) return 1;
    return Math.pow(0.5, elapsedMs / HALF_LIFE_MS);
}

export async function loadData() {
    const currentUser = UserStore.getCurrentUser();
    currentStoreKey = currentUser
        ? STORE_KEY_PREFIX + currentUser.id
        : STORE_KEY_PREFIX + "default";
    try {
        const source = await DataStore.get(currentStoreKey).catch(() => ({}));
        frequencyCache = (source && typeof source === "object") ? source : Object.create(null);
    } catch {
        frequencyCache = Object.create(null);
    }
    notifyScoreListeners();
}

export function queueSave() {
    if (saveDebounce) clearTimeout(saveDebounce);
    saveDebounce = setTimeout(() => {
        saveDebounce = null;
        DataStore.set(currentStoreKey, frequencyCache).catch(e => console.warn(e));
    }, 400);
}

export function getCurrentStoreKey(): string { return currentStoreKey; }

function pruneCache() {
    const entries = Object.entries(frequencyCache);
    if (entries.length <= KEEP_TOP_ENTRIES) return;
    const sorted = entries
        .map(([id, data]) => ({ id, score: getCompositeScore(data) }))
        .sort((a, b) => b.score - a.score);
    for (const { id, score } of sorted.slice(KEEP_TOP_ENTRIES)) {
        if (score < MIN_SCORE_THRESHOLD) delete frequencyCache[id];
    }
}

function getSafeAffinities(): any[] {
    if (settings.store.ignoreAffinities) return [];
    try {
        if (!UserAffinitiesStore || typeof UserAffinitiesStore.getUserAffinities !== "function") return [];
        const data = UserAffinitiesStore.getUserAffinities();
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

export async function syncWithAffinities() {
    if (settings.store.ignoreAffinities) return;
    const affinities = getSafeAffinities();
    if (affinities.length === 0) return;
    const now = Date.now();
    let changed = false;
    for (const affinity of affinities) {
        const userId = affinity.otherUserId ?? affinity.user_id;
        if (!isSafeUserId(userId)) continue;
        if (!RelationshipStore.isFriend(userId)) continue;
        const dmP: number = affinity.dmProbability ?? 0;
        const vcP: number = affinity.vcProbability ?? 0;
        if (!frequencyCache[userId]) {
            frequencyCache[userId] = {
                ds: dmP * 20,
                vs: vcP * 20,
                dl: dmP > 0 ? now : 0,
                vl: vcP > 0 ? now : 0,
                af: (dmP + vcP) * 50
            };
            changed = true;
        }
    }
    if (changed) {
        queueSave();
        notifyScoreListeners();
    }
}

export function getCompositeScore(data: FrequencyData): number {
    const now = Date.now();
    const dmDecayed = data.dl > 0 ? data.ds * expDecay(now - data.dl) : 0;
    const vcDecayed = data.vl > 0 ? data.vs * expDecay(now - data.vl) : 0;
    const affinityPart = settings.store.ignoreAffinities ? 0 : data.af * AFFINITY_WEIGHT;
    return dmDecayed * DM_WEIGHT + vcDecayed * VC_WEIGHT + affinityPart;
}

export function recordInteraction(userId: string, type: "dm" | "voice", weight: number = 1) {
    if (!isSafeUserId(userId)) return;
    if (!RelationshipStore.isFriend(userId)) return;
    const now = Date.now();
    if (!frequencyCache[userId]) frequencyCache[userId] = { ds: 0, vs: 0, dl: 0, vl: 0, af: 0 };
    const entry = frequencyCache[userId];
    if (type === "dm") {
        const elapsed = entry.dl > 0 ? now - entry.dl : 0;
        const cooldown = elapsed >= DM_COOLDOWN_MS ? 1 : elapsed / DM_COOLDOWN_MS;
        entry.ds = entry.ds * expDecay(elapsed) + DM_POINTS * weight * cooldown;
        entry.dl = now;
    } else {
        const elapsed = entry.vl > 0 ? now - entry.vl : 0;
        entry.vs = entry.vs * expDecay(elapsed) + VC_POINTS * weight;
        entry.vl = now;
    }
    pruneCache();
    queueSave();
    notifyScoreListeners();
}

export function getRankedFriendIds(): string[] {
    return Object.entries(frequencyCache)
        .filter(([id]) => RelationshipStore.isFriend(id))
        .map(([id, data]) => ({ id, score: getCompositeScore(data) }))
        .sort((a, b) => b.score - a.score)
        .map(e => e.id);
}

export function startVoiceScoring() {
    // Prevent double-interval: if a race between _initVoiceState and
    // onVoiceStateUpdate causes two startVoiceScoring() calls before the
    // first setInterval is registered, the lock blocks the second one.
    if (voiceScoringActive) {
        stopVoiceScoring();
    }
    voiceScoringActive = true;
    voiceScoreInterval = setInterval(() => {
        const currentUser = UserStore.getCurrentUser();
        if (!currentUser || !currentVoiceChannelId) { stopVoiceScoring(); return; }
        const allVoiceStates = VoiceStateStore.getVoiceStatesForChannel(currentVoiceChannelId);
        if (!allVoiceStates) return;
        for (const peerId of Object.keys(allVoiceStates)) {
            if (peerId !== currentUser.id && RelationshipStore.isFriend(peerId)) {
                recordInteraction(peerId, "voice");
            }
        }
    }, 60000);
}

export function stopVoiceScoring() {
    voiceScoringActive = false;
    if (voiceScoreInterval) { clearInterval(voiceScoreInterval); voiceScoreInterval = null; }
}
