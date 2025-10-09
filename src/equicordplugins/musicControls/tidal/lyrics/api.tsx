/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "../../settings";
import { Track } from "../TidalStore";
import { EnhancedLyric } from "./types";

export async function getLyrics(track: Track | null, url?: string, retries = 3): Promise<EnhancedLyric[] | null> {
    if (!track?.id) return null;

    const { TidalLyricFetch } = settings.store;
    const defaultUrl = settings.def.TidalLyricFetch.default;
    const fetchUrl = (url ?? TidalLyricFetch) + "lyrics?tidal_id=" + track.id;

    try {
        const res = await fetch(fetchUrl);
        if (!res.ok) {
            if (retries > 1) {
                return getLyrics(track, url ?? defaultUrl, retries - 1);
            }
            console.error("Failed to fetch lyrics after retries:", res.status, res.statusText);
            return null;
        }

        const data = await res.json();
        if (!data?.enhancedLyrics || !Array.isArray(data.enhancedLyrics)) {
            console.error("Invalid lyrics data", data);
            return null;
        }

        return data.enhancedLyrics;
    } catch (err) {
        if (retries > 1) {
            return getLyrics(track, url ?? defaultUrl, retries - 1);
        }
        console.error("Error fetching lyrics after retries:", err);
        return null;
    }
}
