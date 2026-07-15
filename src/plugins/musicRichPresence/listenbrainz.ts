/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { Logger } from "@utils/Logger";

import { ScrobblerBackend, TrackData } from ".";

const logger = new Logger("AudioScrobblerRichPresence/ListenBrainz");

const url = (path: string) => `https://listenbrainz.org${path}`;

async function fetchCoverArt(releaseGroupMBID: string) {
    const res = await fetch(`https://coverartarchive.org/release-group/${releaseGroupMBID}`);
    if (!res.ok) return null;
    return res.json().then(json => json.images[0].thumbnails.large);
}

async function getUrls(additionalInfo: Record<string, string> | undefined, trackName: string, artistName: string, releaseName: string): Promise<Partial<TrackData>> {
    // Well tagged music will have MBIDs which we can use directly. These are optional but highly recommended in ListenBrainz scrobbles.
    // If your music doesn't have these, it's highly recommended to use https://picard.musicbrainz.org/ to automatically add them
    if (additionalInfo?.recording_mbid) {
        const { release_group_mbid, release_mbid, recording_mbid, artist_mbids } = additionalInfo;

        return {
            imageURL: release_group_mbid ? await fetchCoverArt(release_group_mbid) : undefined,
            trackURL: recording_mbid ? url(`/track/${recording_mbid}`) : undefined,
            albumURL: release_group_mbid
                ? url(`/release-group/${release_group_mbid}`)
                : release_mbid
                    ? url(`/release/${release_mbid}`)
                    : undefined,
            artistURL: artist_mbids?.length ? url(`/artist/${artist_mbids[0]}`) : undefined,
        };
    }

    // If no MBIDs are present, try to search for the track on MusicBrainz

    // this needs to be encoded separately—URLSearchParams encodes spaces as "+"
    const query = encodeURIComponent(`artist:"${artistName}" AND recording:"${trackName}" AND album:${releaseName}`);

    const params = new URLSearchParams({
        fmt: "json",
        limit: "1"
    });

    const metadata = await fetch("https://musicbrainz.org/ws/2/recording/?" + params + "&query=" + query, {
        headers: { "User-Agent": VENCORD_USER_AGENT }
    })
        .then(res => res.ok ? res.json() : Promise.reject(new Error(`${res.status} ${res.statusText}`)))
        .then(json => json.recordings?.[0]);

    if (!metadata) {
        return {};
    }

    const artist = metadata["artist-credit"]?.[0]?.artist;
    const release = metadata.releases?.[0];

    return {
        imageURL: release?.["release-group"] ? await fetchCoverArt(release["release-group"].id) : undefined,
        trackURL: url(`/track/${metadata.id}/`),
        albumURL: release?.id ? url(`/release/${release.id}/`) : release?.["release-group"]?.id ? url(`/release-group/${release["release-group"].id}/`) : undefined,
        artistURL: artist?.id ? url(`/artist/${artist.id}/`) : undefined,
    };
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
                serviceName: additional_info?.music_service_name || additional_info?.submission_client,
                ...await getUrls(additional_info, track_name, artist_name, release_name)
            } as TrackData;

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
