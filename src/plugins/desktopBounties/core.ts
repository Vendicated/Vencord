/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 danyx64
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { filters, findByPropsLazy, findStoreLazy, mapMangledModuleLazy } from "@webpack";
import { LocaleStore, NavigationRouter, RestAPI, UserStore } from "@webpack/common";

// Current Discord mobile Quest Home fetches Bounties through VIDEO_MODAL_MOBILE (5).
// QUEST_HOME_MOBILE_CAROUSEL (4) still exists in the enum, but the current hook does not use it for Bounty delivery.
export const BOUNTY_VIDEO_MODAL_MOBILE_PLACEMENT = 5;
export const BOUNTY_CREATIVE_TYPE = 3;
export const MAX_DECISIONS = 5;
export const BOUNTIES_ROUTE_PARAM = "vc_bounties";
export const BOUNTIES_ROUTE = `/quest-home?${BOUNTIES_ROUTE_PARAM}=1`;

const AD_SESSION_STORAGE_KEY = "vc-desktop-bounties-ad-session-v1";
const PROGRESS_STORAGE_KEY = "vc-desktop-bounties-progress-v1";
const LEGACY_CLAIMED_STORAGE_KEY = "vc-desktop-bounties-claimed-v1";
const AD_SESSION_IDLE_MS = 30 * 60 * 1000;
const AD_SESSION_MAX_MS = 12 * 60 * 60 * 1000;
const RECENTLY_CLAIMED_TTL_MS = 10 * 60 * 1000;

let legacyStateCleared = false;
const bountyFetchInFlightByUser = new Map<string, Promise<LoadResult>>();
const bountyCacheByUser = new Map<string, { expiresAt: number; result: LoadResult; }>();
const recentlyClaimedByUser = new Map<string, Map<string, number>>();

const DEFAULT_BOUNTY_CACHE_MS = 30_000;
const MIN_BOUNTY_CACHE_MS = 5_000;
const MAX_BOUNTY_CACHE_MS = 5 * 60_000;

const LEGACY_GLOBAL_KEYS = [
    AD_SESSION_STORAGE_KEY,
    PROGRESS_STORAGE_KEY,
    LEGACY_CLAIMED_STORAGE_KEY,
    "vc-desktop-bounties-claimed-snapshots-v1",
    "vc-desktop-bounties-seen-v1",
    "vc-desktop-bounties-video-quest-history-v1"
];

interface DiscordSession {
    uuid?: string;
    createdAtTimestamp?: number;
    lastUsedTimestamp?: number;
}

const NativeHeartbeatSession = mapMangledModuleLazy("LAST_CLIENT_HEARTBEAT_SESSION", {
    getSession: filters.byCode("handleUpdateTimeSpentSessionId", "lastUsedTimestamp")
}) as {
    getSession?: (updateGateway?: boolean) => Promise<DiscordSession | null>;
};

const NativeAdSession = mapMangledModuleLazy("future facing timestamp Date.now()", {
    getOrRefreshAdSession: filters.byCode("createdAtTimestamp", "lastUsedTimestamp", "AD_SESSION_RESET")
}) as {
    getOrRefreshAdSession?: (updateLastUsed?: boolean) => DiscordSession | null;
};

const NetworkStore = findStoreLazy("NetworkStore") as {
    getType?: () => unknown;
};


const AnalyticsUtils = findByPropsLazy(
    "getSuperProperties",
    "getSuperPropertiesBase64",
    "extendSuperProperties"
) as {
    getSuperProperties?: () => Record<string, unknown>;
};

const MOBILE_CLIENT_VERSION = "347.4 - rn";
const MOBILE_CLIENT_BUILD_NUMBER = 6453;
const MOBILE_NATIVE_BUILD_NUMBER = 347204;
const MOBILE_RELEASE_CHANNEL = "googleRelease";

export interface BountyCTA {
    url?: string;
    button_label?: string;
}

export interface BountyCreativeContent {
    id: string;
    advertiser_name?: string;
    product_name?: string;
    product_icon?: string;
    video_preview?: string;
    image_preview?: string;
    video_hls?: string;
    cta?: BountyCTA;
    reward_timer_seconds?: number;
    video_duration_seconds?: number;
}

export interface BountyCreative {
    type?: number;
    creative_type?: number;
    creative_content?: BountyCreativeContent;
    starts_at?: string;
    ends_at?: string;
}

export interface AdDecision {
    creative?: BountyCreative | null;
    quest?: unknown;
    request_id?: string | number;
    ad_identifiers?: {
        creative_type?: number;
        creative_id?: string;
        ad_content_id?: string;
        [key: string]: unknown;
    } | null;
    metadata_sealed?: string;
    traffic_metadata_sealed?: string;
    provenance_metadata_sealed?: string;
    ad_context?: unknown;
    response_ttl_seconds?: number;
    [key: string]: unknown;
}

interface DecisionsResponse {
    request_id?: string;
    decisions?: AdDecision[];
}

export interface ScanAttempt {
    endpoint: "/quests/get-decisions";
    returned: number;
    bountyCount: number;
    creativeTypes: Array<number | null>;
}

export interface LoadResult {
    userId: string;
    requestId?: string;
    decisions: AdDecision[];
    bounties: AdDecision[];
    clientAdSessionId: string;
    clientHeartbeatSessionId?: string;
    source: "get-decisions" | "none";
    attempts: ScanAttempt[];
}

interface StoredAdSession {
    id: string;
    createdAt: number;
    lastUsedAt: number;
}

interface RequestContext {
    clientAdSessionId: string;
    clientHeartbeatSessionId?: string;
    connectionType?: unknown;
}

export function getCurrentUserId(): string | null {
    return UserStore.getCurrentUser()?.id ?? null;
}

function requireCurrentUserId(): string {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("No authenticated Discord user");
    return userId;
}

function assertCurrentUser(expectedUserId: string) {
    if (getCurrentUserId() !== expectedUserId) {
        throw new Error("Discord account changed while the Bounty operation was running");
    }
}

function scopedStorageKey(base: string, userId: string): string {
    return `${base}:${userId}`;
}

function clearLegacyGlobalStateOnce() {
    if (legacyStateCleared) return;
    legacyStateCleared = true;

    try {
        for (const key of LEGACY_GLOBAL_KEYS) localStorage.removeItem(key);

        // Older builds persisted claimed IDs indefinitely. They are now only
        // kept briefly in memory so Discord remains the authoritative source.
        for (let index = localStorage.length - 1; index >= 0; index--) {
            const key = localStorage.key(index);
            if (key?.startsWith(`${LEGACY_CLAIMED_STORAGE_KEY}:`)) {
                localStorage.removeItem(key);
            }
        }
    } catch { }
}

function createUuid(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function getFallbackAdSessionId(userId: string): string {
    const now = Date.now();
    const key = scopedStorageKey(AD_SESSION_STORAGE_KEY, userId);

    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            const stored = JSON.parse(raw) as StoredAdSession;
            if (
                stored.id
                && now - stored.lastUsedAt < AD_SESSION_IDLE_MS
                && now - stored.createdAt < AD_SESSION_MAX_MS
            ) {
                localStorage.setItem(key, JSON.stringify({ ...stored, lastUsedAt: now }));
                return stored.id;
            }
        }
    } catch { }

    const fresh: StoredAdSession = {
        id: createUuid(),
        createdAt: now,
        lastUsedAt: now
    };

    try {
        localStorage.setItem(key, JSON.stringify(fresh));
    } catch { }

    return fresh.id;
}

export function getAdSessionId(userId = requireCurrentUserId()): string {
    assertCurrentUser(userId);

    try {
        const native = NativeAdSession.getOrRefreshAdSession?.();
        if (native?.uuid) return native.uuid;
    } catch (error) {
        console.warn("[DesktopBounties] Could not reuse Discord ad session", error);
    }

    return getFallbackAdSessionId(userId);
}

async function getHeartbeatSessionId(): Promise<string | undefined> {
    try {
        const native = await NativeHeartbeatSession.getSession?.();
        return native?.uuid || undefined;
    } catch (error) {
        console.warn("[DesktopBounties] Could not reuse Discord heartbeat session", error);
        return undefined;
    }
}

function getConnectionType(): unknown {
    try {
        return NetworkStore.getType?.();
    } catch {
        return undefined;
    }
}

function readProgress(userId: string): Record<string, number> {
    try {
        return JSON.parse(localStorage.getItem(scopedStorageKey(PROGRESS_STORAGE_KEY, userId)) ?? "{}") as Record<string, number>;
    } catch {
        return {};
    }
}

export function getSavedProgress(userId: string, id: string): number {
    return Math.max(0, Number(readProgress(userId)[id]) || 0);
}

export function saveProgress(userId: string, id: string, seconds: number) {
    try {
        const all = readProgress(userId);
        all[id] = Math.max(0, seconds);
        localStorage.setItem(scopedStorageKey(PROGRESS_STORAGE_KEY, userId), JSON.stringify(all));
    } catch { }
}

function isRecentlyClaimed(userId: string, id: string): boolean {
    const claims = recentlyClaimedByUser.get(userId);
    if (!claims) return false;

    const now = Date.now();
    for (const [creativeId, claimedAt] of claims) {
        if (now - claimedAt >= RECENTLY_CLAIMED_TTL_MS) claims.delete(creativeId);
    }

    if (claims.size === 0) recentlyClaimedByUser.delete(userId);
    return claims.has(id);
}

export function rememberClaimed(userId: string, id: string) {
    let claims = recentlyClaimedByUser.get(userId);
    if (!claims) {
        claims = new Map();
        recentlyClaimedByUser.set(userId, claims);
    }
    claims.set(id, Date.now());

    try {
        const progress = readProgress(userId);
        if (id in progress) {
            delete progress[id];
            localStorage.setItem(scopedStorageKey(PROGRESS_STORAGE_KEY, userId), JSON.stringify(progress));
        }
    } catch { }
}

export function mediaUrl(asset?: string): string | undefined {
    if (!asset) return undefined;
    if (/^(?:https?:|blob:|data:)/i.test(asset)) return asset;

    return `https://cdn.discordapp.com/${asset.replace(/^\/+/, "")}`;
}

export function safeExternalUrl(value?: string): string | undefined {
    if (!value) return undefined;

    try {
        const parsed = new URL(value);
        return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : undefined;
    } catch {
        return undefined;
    }
}

export function openExternal(value?: string) {
    const url = safeExternalUrl(value);
    if (!url) return;

    if (typeof VencordNative !== "undefined") VencordNative.native.openExternal(url);
    else window.open(url, "_blank", "noopener,noreferrer");
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;

    if (error && typeof error === "object") {
        const maybeError = error as {
            body?: { message?: string; code?: number; };
            message?: string;
            status?: number;
        };

        if (maybeError.body?.message) {
            return `${maybeError.body.message}${maybeError.body.code != null ? ` (${maybeError.body.code})` : ""}`;
        }
        if (maybeError.message) return maybeError.message;
        if (maybeError.status != null) return `HTTP ${maybeError.status}`;
    }

    return String(error);
}

export function getCreativeType(decision: AdDecision): number | undefined {
    return decision.creative?.creative_type
        ?? decision.creative?.type
        ?? decision.ad_identifiers?.creative_type;
}

export function getBountyContent(decision: AdDecision): BountyCreativeContent | undefined {
    return decision.creative?.creative_content;
}

function filterBounties(decisions: AdDecision[], userId: string): AdDecision[] {
    const seen = new Set<string>();
    const bounties: AdDecision[] = [];

    for (const decision of decisions) {
        const content = getBountyContent(decision);
        if (
            getCreativeType(decision) !== BOUNTY_CREATIVE_TYPE
            || content?.id == null
            || isRecentlyClaimed(userId, content.id)
            || seen.has(content.id)
        ) continue;

        seen.add(content.id);
        bounties.push(decision);
    }

    return bounties;
}

function makeRequestContext(connectionType: unknown): Record<string, unknown> | undefined {
    return connectionType == null ? undefined : { connection_type: connectionType };
}

function assertSuccessfulResponse(response: any) {
    const status = Number(response?.status);
    if (!Number.isFinite(status) || status < 400) return;

    const error = new Error(response?.body?.message || `Discord request failed with HTTP ${status}`) as Error & {
        body?: unknown;
        status?: number;
    };
    error.body = response?.body;
    error.status = status;
    throw error;
}

function getBountyCacheDuration(decisions: AdDecision[]): number {
    const ttlSeconds = decisions
        .map(decision => Number(decision.response_ttl_seconds))
        .filter(ttl => Number.isFinite(ttl) && ttl > 0);

    if (ttlSeconds.length === 0) return DEFAULT_BOUNTY_CACHE_MS;

    const ttlMs = Math.min(...ttlSeconds) * 1000;
    return Math.min(MAX_BOUNTY_CACHE_MS, Math.max(MIN_BOUNTY_CACHE_MS, ttlMs));
}

function encodeBase64Json(value: unknown): string {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = "";

    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

function getMobileSuperPropertiesBase64(): string | undefined {
    try {
        const current = AnalyticsUtils.getSuperProperties?.() ?? {};
        const mobile: Record<string, unknown> = {
            ...current,
            os: "Android",
            browser: "Discord Android",
            device: "Android",
            system_locale: LocaleStore.locale || navigator.language || "en-US",
            client_version: MOBILE_CLIENT_VERSION,
            release_channel: MOBILE_RELEASE_CHANNEL,
            client_build_number: MOBILE_CLIENT_BUILD_NUMBER,
            native_build_number: MOBILE_NATIVE_BUILD_NUMBER,
            design_id: 2,
            client_event_source: null
        };

        // Electron-only fields conflict with the Android identity Discord mobile
        // sends in X-Super-Properties, so do not carry them into this request.
        for (const key of [
            "os_arch",
            "app_arch",
            "window_manager",
            "distro",
            "runtime_environment",
            "display_server",
            "os_sdk_version"
        ]) {
            delete mobile[key];
        }

        return encodeBase64Json(mobile);
    } catch (error) {
        console.warn("[DesktopBounties] Could not build mobile super properties", error);
        return undefined;
    }
}

function attachMobileDeliveryHeaders(request: any) {
    const mobileSuperProperties = getMobileSuperPropertiesBase64();
    if (!mobileSuperProperties) return;

    request.headers = {
        ...(request.headers ?? {}),
        "X-Super-Properties": mobileSuperProperties
    };
}

async function fetchQuestHomeBountyDecisions(context: RequestContext): Promise<{
    requestId?: string;
    decisions: AdDecision[];
}> {
    const query: Record<string, string | number> = {
        placement: BOUNTY_VIDEO_MODAL_MOBILE_PLACEMENT,
        client_ad_session_id: context.clientAdSessionId,
        num_decisions_requested: MAX_DECISIONS
    };

    if (context.clientHeartbeatSessionId) {
        query.client_heartbeat_session_id = context.clientHeartbeatSessionId;
    }

    const request: any = {
        url: "/quests/get-decisions",
        query,
        rejectWithError: false
    };

    const requestContext = makeRequestContext(context.connectionType);
    if (requestContext) request.context = requestContext;
    attachMobileDeliveryHeaders(request);

    const response = await (RestAPI.get as any)(request);
    assertSuccessfulResponse(response);
    const body = (response?.body ?? {}) as DecisionsResponse;

    return {
        requestId: body.request_id,
        decisions: Array.isArray(body.decisions) ? body.decisions : []
    };
}

function scanAttempt(decisions: AdDecision[], bountyCount: number): ScanAttempt {
    return {
        endpoint: "/quests/get-decisions",
        returned: decisions.length,
        bountyCount,
        creativeTypes: decisions.map(decision => getCreativeType(decision) ?? null)
    };
}

async function performBountyFetch(userId: string): Promise<LoadResult> {
    clearLegacyGlobalStateOnce();
    assertCurrentUser(userId);

    const clientAdSessionId = getAdSessionId(userId);
    const clientHeartbeatSessionId = await getHeartbeatSessionId();
    assertCurrentUser(userId);

    const connectionType = getConnectionType();
    const context: RequestContext = {
        clientAdSessionId,
        clientHeartbeatSessionId,
        connectionType
    };

    // Mirror the current Discord Android Quest Home Bounty delivery request.
    const response = await fetchQuestHomeBountyDecisions(context);
    assertCurrentUser(userId);

    const bounties = filterBounties(response.decisions, userId);
    const attempts = [scanAttempt(response.decisions, bounties.length)];

    console.info("[DesktopBounties] scan result", {
        userId,
        endpoint: "/quests/get-decisions",
        placement: BOUNTY_VIDEO_MODAL_MOBILE_PLACEMENT,
        placementName: "VIDEO_MODAL_MOBILE",
        requested: MAX_DECISIONS,
        returned: response.decisions.length,
        bounties: bounties.length,
        hasHeartbeatSession: Boolean(clientHeartbeatSessionId),
        connectionType,
        creativeTypes: response.decisions.map(decision => getCreativeType(decision) ?? null)
    });

    return {
        userId,
        requestId: response.requestId,
        decisions: response.decisions,
        bounties,
        clientAdSessionId,
        clientHeartbeatSessionId,
        source: bounties.length > 0 ? "get-decisions" : "none",
        attempts
    };
}

export function invalidateBountyCache(userId: string) {
    bountyCacheByUser.delete(userId);
}

function refreshFilteredResult(result: LoadResult, userId: string): LoadResult {
    const bounties = filterBounties(result.decisions, userId);

    if (bounties === result.bounties) return result;

    return {
        ...result,
        bounties,
        source: bounties.length > 0 ? "get-decisions" : "none"
    };
}

export function fetchBounties(userId: string, force = false): Promise<LoadResult> {
    assertCurrentUser(userId);

    if (!force) {
        const cached = bountyCacheByUser.get(userId);
        if (cached && cached.expiresAt > Date.now()) {
            const fresh = refreshFilteredResult(cached.result, userId);
            if (fresh !== cached.result) cached.result = fresh;
            return Promise.resolve(fresh);
        }
    }

    const existing = bountyFetchInFlightByUser.get(userId);
    if (existing) return existing.then(result => refreshFilteredResult(result, userId));

    const request = performBountyFetch(userId)
        .then(result => {
            const fresh = refreshFilteredResult(result, userId);
            bountyCacheByUser.set(userId, {
                expiresAt: Date.now() + getBountyCacheDuration(fresh.decisions),
                result: fresh
            });
            return fresh;
        })
        .finally(() => {
            if (bountyFetchInFlightByUser.get(userId) === request) {
                bountyFetchInFlightByUser.delete(userId);
            }
        });

    bountyFetchInFlightByUser.set(userId, request);
    return request;
}

export async function claimBounty(decision: AdDecision, userId: string) {
    assertCurrentUser(userId);

    const content = getBountyContent(decision);
    if (!content?.id) throw new Error("Missing Bounty creative ID");

    // Discord mobile refreshes/reuses the native ad session at claim time.
    const clientAdSessionId = getAdSessionId(userId);
    const clientHeartbeatSessionId = await getHeartbeatSessionId();
    assertCurrentUser(userId);

    const body: Record<string, string | null> = {
        decision_metadata_sealed: decision.metadata_sealed ?? null,
        traffic_metadata_sealed: decision.traffic_metadata_sealed ?? null,
        client_ad_session_id: clientAdSessionId,
        client_heartbeat_session_id: clientHeartbeatSessionId ?? null
    };

    const request: any = {
        url: `/quests/creatives/${content.id}/claim-reward`,
        body,
        rejectWithError: false
    };
    attachMobileDeliveryHeaders(request);

    const response = await (RestAPI.post as any)(request);
    assertSuccessfulResponse(response);

    rememberClaimed(userId, content.id);
    invalidateBountyCache(userId);
}

export function isBountiesRoute(): boolean {
    return location.pathname === "/quest-home"
        && new URLSearchParams(location.search).get(BOUNTIES_ROUTE_PARAM) === "1";
}

export function openBountiesPage() {
    NavigationRouter.transitionTo(BOUNTIES_ROUTE);
}
