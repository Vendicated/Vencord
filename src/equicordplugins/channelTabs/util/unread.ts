/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { ChannelUnreadState, reconcileUnreadFallbackCache } from "@equicordplugins/channelTabs/util/unreadState";

export interface PersistedUnreadFallbacks {
    [userId: string]: Record<string, number>;
}

const DATASTORE_KEY = "ChannelTabs_unreadFallbacks_v1";
const unreadFallbacks: PersistedUnreadFallbacks = {};
const unreadFallbackLoads = new Map<string, Promise<Record<string, number>>>();
const unreadFallbackSaves = new Map<string, Promise<void>>();

export function getUnreadFallbackCounts(userId: string) {
    return unreadFallbacks[userId] ?? {};
}

export async function ensureUnreadFallbackCountsLoaded(userId: string) {
    if (unreadFallbacks[userId]) return unreadFallbacks[userId];
    if (unreadFallbackLoads.has(userId)) return unreadFallbackLoads.get(userId)!;

    const loadPromise = DataStore.get<PersistedUnreadFallbacks>(DATASTORE_KEY)
        .then(fallbacks => {
            unreadFallbacks[userId] = {
                ...(fallbacks?.[userId] ?? {}),
                ...(unreadFallbacks[userId] ?? {})
            };
            unreadFallbackLoads.delete(userId);
            return unreadFallbacks[userId];
        });

    unreadFallbackLoads.set(userId, loadPromise);
    return loadPromise;
}

export function updateUnreadFallbackCounts(userId: string, channelStates: ChannelUnreadState[]) {
    const currentFallbacks = unreadFallbacks[userId] ?? {};
    const nextFallbacks = reconcileUnreadFallbackCache(currentFallbacks, channelStates);
    if (JSON.stringify(nextFallbacks) === JSON.stringify(currentFallbacks)) return;

    unreadFallbacks[userId] = nextFallbacks;

    const pendingSave = unreadFallbackSaves.get(userId) ?? Promise.resolve();
    const nextSave = pendingSave
        .catch(() => void 0)
        .then(() => DataStore.update<PersistedUnreadFallbacks>(DATASTORE_KEY, old => ({
            ...(old ?? {}),
            [userId]: unreadFallbacks[userId]
        })));

    unreadFallbackSaves.set(userId, nextSave);
}
