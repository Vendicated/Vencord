/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LyricsData, Provider } from "../types";

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


export async function getLyricsSpotify(trackId: string): Promise<LyricsData | null> {
    const resp = await fetch("https://spotify-lyrics-api-pi.vercel.app/?trackid=" + trackId);
    if (!resp.ok) return null;

    let data: LyricsAPIResp;
    try {
        data = await resp.json() as LyricsAPIResp;
    } catch (e) {
        return null;
    }

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
