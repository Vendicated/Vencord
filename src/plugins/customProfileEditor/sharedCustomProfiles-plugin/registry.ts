/*
 * Vencord, a modification for Discord's desktop app
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    payloadToEffective,
    profileHasSharedContent,
    SHARED_PROFILE_VERSION,
    type SharedEffectiveProfile,
    type SharedProfilePayload,
} from "@api/SharedCustomProfiles";
import { FluxDispatcher } from "@webpack/common";

import { settings } from "./settings";

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<
    string,
    { data: SharedProfilePayload | null; fetchedAt: number }
>();
const inflight = new Map<string, Promise<SharedProfilePayload | null>>();

export function getRegistryBaseUrl(): string {
    return settings.store.registryBaseUrl.trim().replace(/\/+$/, "");
}

export function isSyncEnabled(): boolean {
    return settings.store.syncProfilesFromOthers;
}

function storeCache(userId: string, data: SharedProfilePayload | null) {
    cache.set(userId, { data, fetchedAt: Date.now() });
}

export function getCachedSharedProfile(
    userId: string,
): SharedProfilePayload | null | undefined {
    const entry = cache.get(userId);
    if (!entry) return undefined;
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return undefined;
    return entry.data;
}

export function getRemoteEffectiveProfile(
    userId: string,
): SharedEffectiveProfile | null {
    if (!isSyncEnabled()) return null;

    const shared = getCachedSharedProfile(userId);
    if (shared === undefined || !shared) return null;

    const effective = payloadToEffective(shared);
    return profileHasSharedContent(effective) ? effective : null;
}

export async function fetchSharedProfile(
    userId: string,
    force = false,
): Promise<SharedProfilePayload | null> {
    const base = getRegistryBaseUrl();
    if (!base || !isSyncEnabled()) return null;

    if (!force) {
        const cached = getCachedSharedProfile(userId);
        if (cached !== undefined) return cached;
    }

    const existing = inflight.get(userId);
    if (existing) return existing;

    const request = (async () => {
        try {
            const res = await fetch(`${base}/profile/${userId}`, {
                method: "GET",
                cache: "no-cache",
            });
            if (res.status === 404) {
                storeCache(userId, null);
                return null;
            }
            if (!res.ok) return null;

            const data = (await res.json()) as SharedProfilePayload;
            if (
                data.userId !== userId ||
                data.version !== SHARED_PROFILE_VERSION
            ) {
                storeCache(userId, null);
                return null;
            }

            storeCache(userId, data);
            return data;
        } catch {
            return null;
        } finally {
            inflight.delete(userId);
        }
    })();

    inflight.set(userId, request);
    return request;
}

export async function publishSharedProfile(
    userId: string,
    payload: SharedProfilePayload,
): Promise<boolean> {
    const base = getRegistryBaseUrl();
    if (!base) return false;

    try {
        const res = await fetch(`${base}/profile/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function prefetchSharedProfile(userId: string): Promise<void> {
    if (!userId || !isSyncEnabled() || !getRegistryBaseUrl()) return;

    const data = await fetchSharedProfile(userId);
    if (data) {
        FluxDispatcher.dispatch({ type: "USER_PROFILE_UPDATE", userId });
    }
}

export function invalidateSharedProfileCache(userId?: string) {
    if (userId) cache.delete(userId);
    else cache.clear();
}
