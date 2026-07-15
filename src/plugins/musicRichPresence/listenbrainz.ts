/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

import { ScrobblerBackend, TrackData } from ".";

const logger = new Logger("AudioScrobblerRichPresence/ListenBrainz");

const url = (path: string) => `https://listenbrainz.org${path}`;

async function fetchCoverArt(releaseGroupMBID: string) {
    const res = await fetch(`https://coverartarchive.org/release-group/${releaseGroupMBID}`);
    if (!res.ok) return null;
    return res.json().then(json => json.images[0].thumbnails.large);
}

export const ListenBrainzScrobbler: ScrobblerBackend = {
    name: "ListenBrainz",
    id: "listenbrainz",

    async fetchTrackData(username: string, _apiKey?: string): Promise<TrackData | null> {
        try {
            const res = await fetch(`https://api.listenbrainz.org/1/user/${username}/playing-now`);
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

            const data = await res.json().then(json => json.payload?.listens[0]);
            if (!data?.playing_now || !data?.track_metadata)
                return null;

            const { track_name, artist_name, release_name, additional_info } = data.track_metadata;

            const trackData = {
                name: track_name || "Unknown",
                artist: artist_name,
                album: release_name || "Unknown",
            } as TrackData;

            if (additional_info) {
                const { music_service_name, submission_client, release_group_mbid, release_mbid, recording_mbid, artist_mbids } = additional_info;

                Object.assign(trackData, {
                    imageURL: release_group_mbid ? await fetchCoverArt(release_group_mbid) : undefined,
                    serviceName: music_service_name || submission_client,
                    albumURL: release_group_mbid
                        ? url(`/release-group/${release_group_mbid}`)
                        : release_mbid
                            ? url(`/release/${release_mbid}`)
                            : undefined,
                    trackURL: recording_mbid ? url(`/track/${recording_mbid}`) : undefined,
                    artistURL: artist_mbids?.length ? url(`/artist/${artist_mbids[0]}`) : undefined,
                });
            }

            return trackData;
        } catch (e) {
            logger.error("Failed to query ListenBrainz API", e);
            // will clear the rich presence if API fails
            return null;
        }
    },

    getUserURL(username: string): string {
        return url(`/user/${username}`);
    }
};
