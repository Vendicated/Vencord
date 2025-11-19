/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Track } from "@equicordplugins/musicControls/tidal/TidalStore";

import { EnhancedLyric } from "./types";

export async function getLyrics(track: Track | null, retries = 3): Promise<EnhancedLyric[] | null> {
    if (!track?.name || !track?.artist) return null;

    const fetchUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(track.name)}&artist_name=${encodeURIComponent(track.artist)}`;

    try {
        const res = await fetch(fetchUrl);
        if (!res.ok) {
            if (retries > 1) return getLyrics(track, retries - 1);
            console.error("Failed to fetch lyrics:", res.status, res.statusText);
            return null;
        }

        const data = await res.json();
        const synced = data?.syncedLyrics;
        if (!synced) {
            console.error("Invalid lyrics data", data);
            return null;
        }

        const parsed: EnhancedLyric[] = synced
            .split("\n")
            .map(line => {
                const match = line.match(/^\[(\d+):(\d+\.\d+)\]\s*(.*)/);
                if (!match) return null;
                const [, min, sec, text] = match;
                return {
                    time: parseInt(min) * 60 + parseFloat(sec),
                    text: text
                } as EnhancedLyric;
            })
            .filter(Boolean) as EnhancedLyric[];

        return parsed.length ? parsed : null;
    } catch (err) {
        if (retries > 1) return getLyrics(track, retries - 1);
        console.error("Error fetching lyrics:", err);
        return null;
    }
}
