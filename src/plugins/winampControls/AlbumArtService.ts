/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Album art fetching service using native layer to bypass CSP
// Routes requests through Electron main process

import { debugError, debugLog } from "./debugLog";

const LOG_PREFIX = "AlbumArt";

export interface AlbumArtResult {
    url: string;
    source: "deezer" | "itunes" | "cache";
    size: "small" | "medium" | "large";
}

// In-memory cache for album art URLs
const albumArtCache = new Map<string, AlbumArtResult>();

// Pending requests to prevent duplicate fetches
const pendingRequests = new Map<string, Promise<AlbumArtResult | null>>();

// Cache expiry time (1 hour)
const CACHE_EXPIRY_MS = 60 * 60 * 1000;
const cacheTimestamps = new Map<string, number>();

function getCacheKey(artist: string, track: string, album?: string): string {
    const normalizedArtist = artist.toLowerCase().trim();
    const normalizedTrack = track.toLowerCase().trim();
    const normalizedAlbum = album?.toLowerCase().trim();

    if (normalizedAlbum) {
        return `${normalizedArtist}::album::${normalizedAlbum}`;
    }
    return `${normalizedArtist}::track::${normalizedTrack}`;
}

function isExpired(key: string): boolean {
    const timestamp = cacheTimestamps.get(key);
    if (!timestamp) return true;
    return Date.now() - timestamp > CACHE_EXPIRY_MS;
}

function setCache(key: string, result: AlbumArtResult): void {
    albumArtCache.set(key, { ...result, source: "cache" });
    cacheTimestamps.set(key, Date.now());
}

function getFromCache(key: string): AlbumArtResult | null {
    if (isExpired(key)) {
        albumArtCache.delete(key);
        cacheTimestamps.delete(key);
        return null;
    }
    return albumArtCache.get(key) || null;
}

/**
 * Fetch album art for a track using native layer (bypasses CSP)
 * Uses Deezer → iTunes fallback chain
 * Results are cached in memory to avoid redundant API calls
 */
export async function fetchAlbumArt(
    artist: string,
    track: string,
    album?: string
): Promise<AlbumArtResult | null> {
    debugLog(LOG_PREFIX, "────────────────────────────────────────");
    debugLog(LOG_PREFIX, `Request: artist="${artist}", track="${track}", album="${album ?? "(none)"}"`);

    // Validate inputs
    if (!artist || artist === "Unknown Artist") {
        debugLog(LOG_PREFIX, "✗ Skipped: Invalid artist");
        return null;
    }

    if (!track || track === "Unknown Track") {
        debugLog(LOG_PREFIX, "✗ Skipped: Invalid track");
        return null;
    }

    const cacheKey = getCacheKey(artist, track, album);
    debugLog(LOG_PREFIX, `Cache key: "${cacheKey}"`);

    // Check cache first
    const cached = getFromCache(cacheKey);
    if (cached) {
        debugLog(LOG_PREFIX, `✓ Cache HIT: ${cached.url.substring(0, 50)}...`);
        debugLog(LOG_PREFIX, "────────────────────────────────────────");
        return cached;
    }
    debugLog(LOG_PREFIX, "Cache MISS");

    // Check if there's already a pending request for this track
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
        debugLog(LOG_PREFIX, "⏳ Waiting for pending request...");
        return pending;
    }

    debugLog(LOG_PREFIX, "Fetching via native layer...");

    // Create new request
    const fetchPromise = (async (): Promise<AlbumArtResult | null> => {
        const startTime = Date.now();

        try {
            // Use native helper to bypass CSP
            const nativeHelper = VencordNative.pluginHelpers.WinampControls;

            if (!nativeHelper || typeof nativeHelper.fetchAlbumArt !== "function") {
                debugError(LOG_PREFIX, "✗ Native helper not available");
                return null;
            }

            const response = await nativeHelper.fetchAlbumArt(artist, track, album);
            const elapsed = Date.now() - startTime;

            debugLog(LOG_PREFIX, `Native response: success=${response.success}, source=${response.source}, dataUrl=${response.dataUrl ? `${response.dataUrl.substring(0, 50)}...` : "undefined"}`);

            if (response.success && response.dataUrl) {
                const result: AlbumArtResult = {
                    url: response.dataUrl, // This is now a base64 data URL
                    source: response.source || "deezer",
                    size: "large"
                };

                setCache(cacheKey, result);
                debugLog(LOG_PREFIX, `✓ SUCCESS: Found via ${result.source} in ${elapsed}ms`);
                debugLog(LOG_PREFIX, `✓ Data URL length: ${result.url.length} chars`);

                return result;
            } else {
                debugLog(LOG_PREFIX, `✗ FAILED: ${response.error || "No album art found"} (${elapsed}ms)`);
                return null;
            }
        } catch (error) {
            debugError(LOG_PREFIX, "✗ ERROR:", error);
            return null;
        } finally {
            pendingRequests.delete(cacheKey);
            debugLog(LOG_PREFIX, "────────────────────────────────────────");
        }
    })();

    pendingRequests.set(cacheKey, fetchPromise);

    return fetchPromise;
}

/**
 * Clear the album art cache
 */
export function clearAlbumArtCache(): void {
    albumArtCache.clear();
    cacheTimestamps.clear();
    debugLog(LOG_PREFIX, "Cache cleared");
}

/**
 * Get cache statistics
 */
export function getAlbumArtCacheStats(): { size: number; pendingRequests: number; } {
    return {
        size: albumArtCache.size,
        pendingRequests: pendingRequests.size
    };
}
