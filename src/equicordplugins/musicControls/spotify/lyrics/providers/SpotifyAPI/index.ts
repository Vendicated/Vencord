/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LyricsData, Provider } from "@equicordplugins/musicControls/spotify/lyrics/providers/types";

interface LyricsAPIResp {
    error: boolean;
    syncType: string;
    lines: Line[];
}

interface Line {
    startTimeMs: string;
    words: string;
    syllables: any[];
    endTimeMs: string;
}

const defaultSpotifyLyricsApiUrl = "https://spotify-lyrics-api-pi.vercel.app";

function makeSpotifyLyricsApiUrl(trackId: string, customBaseUrl?: string): string {
    const normalizedBaseUrl = customBaseUrl?.trim().replace(/\/+$/, "") || defaultSpotifyLyricsApiUrl;
    const url = new URL(normalizedBaseUrl);
    url.searchParams.set("trackid", trackId);
    return url.toString();
}

export async function getLyricsSpotify(trackId: string, customBaseUrl?: string): Promise<LyricsData | null> {
    const resp = await fetch(makeSpotifyLyricsApiUrl(trackId, customBaseUrl));
    if (!resp.ok) return null;

    let data: LyricsAPIResp;
    try {
        data = await resp.json() as LyricsAPIResp;
    } catch (e) {
        return null;
    }

    if (data.error || !Array.isArray(data.lines) || data.lines.length < 2) return null;

    const lyrics = data.lines;
    if (lyrics[0].startTimeMs === "0" && lyrics[lyrics.length - 1].startTimeMs === "0") return null;

    return {
        useLyric: Provider.Spotify,
        lyricsVersions: {
            Spotify: lyrics.map(line => {
                const trimmedText = line.words.trim();
                return {
                    time: Number(line.startTimeMs) / 1000,
                    text: (trimmedText === "" || trimmedText === "♪") ? null : trimmedText
                };
            })
        }
    };
}
