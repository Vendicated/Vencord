/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

import { TrackData } from ".";

const logger = new Logger("AudioScrobblerRichPresence/ListenBrainz");

export async function fetchListenBrainzData(username: string) {
    try {
        const res = await fetch(`https://api.listenbrainz.org/1/user/${username}/playing-now`);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

        const data = await res.json().then(json => json.payload?.listens[0]);
        if (!data.playing_now)
            return null;

        return {
            name: data.track_metadata.track_name || "Unknown",
            artist: data.track_metadata.artist_name,
            album: data.track_metadata.release_name || "Unknown",
            serviceName: data?.track_metadata.additional_info.music_service_name
        } as TrackData;
    } catch (e) {
        logger.error("Failed to query ListenBrainz API", e);
        // will clear the rich presence if API fails
        return null;
    }
}
