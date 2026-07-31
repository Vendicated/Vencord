import { FluxDispatcher, Toasts, UserStore } from "@webpack/common";

import type { CustomBadgeDefinition } from "./customBadges";
import { getProfile, settings as pluginSettings } from "./settings";

export const SHARED_PROFILE_VERSION = 1;

export interface SharedProfilePayload {
    version: typeof SHARED_PROFILE_VERSION;
    userId: string;
    customUsername: string;
    customDisplayName: string;
    selectedBadges: string[];
    selectedSpecialBadges: string[];
    customBadges: CustomBadgeDefinition[];
    replaceRealBadges: boolean;
    updatedAt: number;
}

export interface EffectiveProfile {
    customUsername: string;
    customDisplayName: string;
    selectedBadges: string[];
    selectedSpecialBadges: string[];
    customBadges: CustomBadgeDefinition[];
    replaceRealBadges: boolean;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<
    string,
    { data: SharedProfilePayload | null; fetchedAt: number }
>();
const inflight = new Map<string, Promise<SharedProfilePayload | null>>();
let cspCheckedForUrl = "";

/** Discord blocks external fetch unless the domain is CSP-whitelisted. */
export async function ensureRegistryCsp(showToasts = false): Promise<boolean> {
    if (IS_WEB) return true;

    const base = getRegistryBaseUrl();
    if (!base) return false;
    if (cspCheckedForUrl === base) return true;

    try {
        if (await VencordNative.csp.isDomainAllowed(base, ["connect-src"])) {
            cspCheckedForUrl = base;
            return true;
        }

        const res = await VencordNative.csp.requestAddOverride(
            base,
            ["connect-src"],
            "CustomProfile",
        );
        if (res === "ok") {
            cspCheckedForUrl = base;
            if (showToasts) {
                Toasts.show({
                    id: Toasts.genId(),
                    type: Toasts.Type.MESSAGE,
                    message:
                        "Registry allowed — fully restart Discord, then Save again",
                });
            }
            return false;
        }

        if (showToasts && res === "cancelled") {
            Toasts.show({
                id: Toasts.genId(),
                type: Toasts.Type.FAILURE,
                message:
                    "Allow the registry domain in the popup to share profiles",
            });
        }
    } catch {
        // fall through
    }

    return false;
}

export function getRegistryBaseUrl(): string {
    return pluginSettings.store.registryBaseUrl.trim().replace(/\/+$/, "");
}

export function isSyncEnabled(): boolean {
    return pluginSettings.store.syncProfilesFromOthers;
}

export function profileHasContent(profile: EffectiveProfile): boolean {
    return Boolean(
        profile.customUsername.trim() ||
        profile.customDisplayName.trim() ||
        profile.selectedBadges.length ||
        profile.selectedSpecialBadges.length ||
        profile.customBadges.some((b) => b.enabled) ||
        profile.replaceRealBadges,
    );
}

export function toEffectiveFromLocal(): EffectiveProfile {
    const p = getProfile();
    return {
        customUsername: p.customUsername,
        customDisplayName: p.customDisplayName,
        selectedBadges: p.selectedBadges,
        selectedSpecialBadges: p.selectedSpecialBadges,
        customBadges: p.customBadges,
        replaceRealBadges: p.replaceRealBadges,
    };
}

export function toSharedPayload(
    userId: string,
    profile: EffectiveProfile,
): SharedProfilePayload {
    return {
        version: SHARED_PROFILE_VERSION,
        userId,
        customUsername: profile.customUsername.trim(),
        customDisplayName: profile.customDisplayName.trim(),
        selectedBadges: profile.selectedBadges,
        selectedSpecialBadges: profile.selectedSpecialBadges,
        customBadges: profile.customBadges,
        replaceRealBadges: profile.replaceRealBadges,
        updatedAt: Date.now(),
    };
}

function payloadToEffective(payload: SharedProfilePayload): EffectiveProfile {
    return {
        customUsername: payload.customUsername,
        customDisplayName: payload.customDisplayName,
        selectedBadges: payload.selectedBadges,
        selectedSpecialBadges: payload.selectedSpecialBadges,
        customBadges: payload.customBadges ?? [],
        replaceRealBadges: payload.replaceRealBadges,
    };
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
): EffectiveProfile | null {
    if (!isSyncEnabled()) return null;
    const shared = getCachedSharedProfile(userId);
    if (shared === undefined || !shared) return null;
    const effective = payloadToEffective(shared);
    return profileHasContent(effective) ? effective : null;
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
            if (!(await ensureRegistryCsp())) return null;

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
    profile: EffectiveProfile,
): Promise<boolean> {
    const base = getRegistryBaseUrl();
    if (!base) {
        Toasts.show({
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE,
            message:
                "Set a Registry URL in CustomProfile settings before sharing",
        });
        return false;
    }

    if (!profileHasContent(profile)) return false;

    if (!(await ensureRegistryCsp(true))) return false;

    try {
        const res = await fetch(`${base}/profile/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toSharedPayload(userId, profile)),
        });

        if (res.ok) {
            Toasts.show({
                id: Toasts.genId(),
                type: Toasts.Type.SUCCESS,
                message:
                    "Shared profile uploaded — friends with CustomProfile can see it",
            });
            return true;
        }

        Toasts.show({
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE,
            message: `Upload failed (${res.status}). Check your registry URL.`,
        });
        return false;
    } catch {
        Toasts.show({
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE,
            message: "Upload failed — is the registry online?",
        });
        return false;
    }
}

/** Refresh Discord UI after remote profile data arrives. */
export function notifyProfileLoaded(
    userId: string,
    patchUser: (user: unknown) => unknown,
) {
    const user = UserStore.getUser(userId);
    if (user) {
        FluxDispatcher.dispatch({ type: "USER_UPDATE", user: patchUser(user) });
    }
    FluxDispatcher.dispatch({ type: "USER_PROFILE_UPDATE", userId });
}

export async function prefetchSharedProfile(
    userId: string,
    patchUser: (user: unknown) => unknown,
): Promise<void> {
    if (!userId || !isSyncEnabled() || !getRegistryBaseUrl()) return;

    const hadCache = getCachedSharedProfile(userId) !== undefined;
    const data = await fetchSharedProfile(userId);
    if (data && !hadCache) {
        notifyProfileLoaded(userId, patchUser);
    }
}
