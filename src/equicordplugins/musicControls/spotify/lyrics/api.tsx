/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import { settings } from "../../settings";
import { Track } from "../SpotifyStore";
import { getLyricsLrclib } from "./providers/lrclibAPI";
import { getLyricsSpotify } from "./providers/SpotifyAPI";
import { LyricsData, Provider, SyncedLyric } from "./providers/types";

const LyricsCacheKey = "SpotifyLyricsCacheNew";

interface NullLyricCacheEntry {
    [Provider.Lrclib]?: boolean;
    [Provider.Spotify]?: boolean;
}

const nullLyricCache = new Map<string, NullLyricCacheEntry>();

export const lyricFetchers = {
    [Provider.Spotify]: async (track: Track) => await getLyricsSpotify(track.id),
    [Provider.Lrclib]: getLyricsLrclib,
};

export const providers = Object.keys(lyricFetchers) as Provider[];

export async function getLyrics(track: Track | null): Promise<LyricsData | null> {
    if (!track || !track.id) return null;

    const cacheKey = track.id;
    const cached = await DataStore.get(LyricsCacheKey) as Record<string, LyricsData | null>;

    if (cached?.[cacheKey]) {
        return cached[cacheKey];
    }

    const nullCacheEntry = nullLyricCache.get(cacheKey);

    if (nullCacheEntry) {
        const provider = settings.store.LyricsProvider;
        if (!settings.store.FallbackProvider && nullCacheEntry[provider]) {
            return null;
        }

        if (providers.every(p => nullCacheEntry[p])) {
            return null;
        }
    }

    const providersToTry = [settings.store.LyricsProvider, ...providers.filter(p => p !== settings.store.LyricsProvider)];

    for (const provider of providersToTry) {
        const lyricsInfo = await lyricFetchers[provider](track);

        if (lyricsInfo) {
            await DataStore.set(LyricsCacheKey, { ...cached, [cacheKey]: lyricsInfo });
            return lyricsInfo;
        }

        const updatedNullCacheEntry = nullLyricCache.get(cacheKey) || {};
        nullLyricCache.set(cacheKey, { ...updatedNullCacheEntry, [provider]: true });
    }

    return null;
}

export async function clearLyricsCache() {
    nullLyricCache.clear();
    await DataStore.set(LyricsCacheKey, {});
}

export async function getLyricsCount(): Promise<number> {
    const cache = await DataStore.get(LyricsCacheKey) as Record<string, LyricsData | null>;
    return Object.keys(cache ?? {}).length;
}

export async function updateLyrics(trackId: string, newLyrics: SyncedLyric[], provider: Provider) {
    const cache = await DataStore.get(LyricsCacheKey) as Record<string, LyricsData | null>;
    const current = cache[trackId];

    await DataStore.set(LyricsCacheKey,
        {
            ...cache, [trackId]: {
                ...current,
                useLyric: provider,
                lyricsVersions: {
                    ...current?.lyricsVersions,
                    [provider]: newLyrics
                }
            }
        }
    );
}

export async function removeTranslations() {
    const cache = await DataStore.get(LyricsCacheKey) as Record<string, LyricsData | null>;
    const newCache = {} as Record<string, LyricsData | null>;

    for (const [trackId, trackData] of Object.entries(cache)) {
        const { Translated, ...lyricsVersions } = trackData?.lyricsVersions || {};
        const newUseLyric = !!lyricsVersions[Provider.Spotify] ? Provider.Spotify : Provider.Lrclib;

        newCache[trackId] = { lyricsVersions, useLyric: newUseLyric };
    }

    await DataStore.set(LyricsCacheKey, newCache);
}

export async function migrateOldLyrics() {
    const oldCache = await DataStore.get("SpotifyLyricsCache");
    if (!oldCache || !Object.entries(oldCache).length) return;

    const filteredCache = Object.entries(oldCache).filter(lrc => lrc[1]);
    const result = {};

    filteredCache.forEach(([trackId, lyrics]) => {
        result[trackId] = {
            lyricsVersions: {
                // @ts-ignore
                LRCLIB: lyrics.map(({ time, text }) => ({ time, text }))
            },
            useLyric: "LRCLIB"
        };
    });

    await DataStore.set(LyricsCacheKey, result);
    await DataStore.set("SpotifyLyricsCache", {});
}
