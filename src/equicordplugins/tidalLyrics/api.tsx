/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Track } from "equicordplugins/tidalControls/TidalStore";

import settings from "./settings";
import { EnhancedLyric } from "./types";




export async function getLyrics(track: Track | null, url?: string): Promise<EnhancedLyric[] | null> {
    if (!track) return null;
    if (!track.id) return null;
    const { CustomUrl } = settings.store;
    const res = await fetch((url ?? CustomUrl) + "lyrics?tidal_id=" + track.id);
    const defaultUrl = settings.def.CustomUrl.default;
    if (!res.ok) {
        if (CustomUrl !== defaultUrl) {
            return getLyrics(track, defaultUrl);
        }
        console.error("Failed to fetch lyrics", res.status, res.statusText);
        return null;
    }
    const data = await res.json();
    if (!data || !data.enhancedLyrics || !Array.isArray(data.enhancedLyrics)) {
        console.error("Invalid lyrics data", data);
        return null;
    }
    return data.enhancedLyrics;
}
