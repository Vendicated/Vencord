/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { TrackData } from "./types";

export async function fetchTrackData(): Promise<TrackData | null> {
    const song = await (await fetch("https://gensokyoradio.net/api/station/playing/")).json();

    return {
        title: song.SONGINFO.TITLE,
        album: song.SONGINFO.ALBUM,
        artist: song.SONGINFO.ARTIST,
        position: song.SONGTIMES.SONGSTART,
        duration: song.SONGTIMES.SONGEND,
        artwork: song.MISC.ALBUMART ? `https://gensokyoradio.net/images/albums/500/${song.MISC.ALBUMART}` : "undefined",
    };
}
