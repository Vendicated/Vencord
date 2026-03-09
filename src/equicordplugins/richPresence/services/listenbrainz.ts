/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { Activity, ActivityButton } from "@vencord/discord-types";
import { ActivityFlags, ActivityType } from "@vencord/discord-types/enums";
import { findByPropsLazy } from "@webpack";
import { ApplicationAssetUtils, FluxDispatcher } from "@webpack/common";

import { settings } from "../settings";
import { NameFormat } from "../types";
import { LbTrackData } from "../types/listenbrainz";

const APPLICATION_ID = "1090155131007406132";
const PLACEHOLDER_ID = "2a96cbd8b46e442fc41c2b86b821562f";
const SOCKET_ID = "RichPresence_LB";
const logger = new Logger("RichPresence:ListenBrainz");
const PresenceStore = findByPropsLazy("getLocalPresence");

let updateInterval: NodeJS.Timeout | undefined;
let currentRecordingMBID = "";
let currentStart = 0;

async function getAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(APPLICATION_ID, [key]))[0];
}

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity, socketId: SOCKET_ID });
}

async function fetchTrackData(): Promise<LbTrackData | null> {
    if (!settings.store.lb_username) {
        logger.warn("ListenBrainz username is not set.");
        return null;
    }

    try {
        const lbRes = await fetch(`https://api.listenbrainz.org/1/user/${settings.store.lb_username}/playing-now`);
        if (!lbRes.ok) throw `${lbRes.status} ${lbRes.statusText}`;

        const lbJson = await lbRes.json();
        if (lbJson.error) {
            logger.error("Error from ListenBrainz API", `${lbJson.error}: ${lbJson.message}`);
            return null;
        }

        const listen = lbJson.payload?.listens?.[0];
        if (!listen?.playing_now) return null;

        const trackMetadata = listen.track_metadata;
        const albumName = trackMetadata.release_name || "Unknown";
        const artistName = trackMetadata.artist_name || "Unknown";

        const mbRes = await fetch(
            `https://musicbrainz.org/ws/2/release/?query=release:${encodeURIComponent(albumName)}%20AND%20artist:${encodeURIComponent(artistName)}&fmt=json`
        );
        if (!mbRes.ok) throw `${mbRes.status} ${mbRes.statusText}`;

        const mbJson = await mbRes.json();
        const releases = mbJson.releases || [];
        const releaseGroup = releases[0]?.["release-group"]?.id;

        let url = "";
        let imageUrl = "";

        if (releaseGroup) {
            const caaRes = await fetch(`https://coverartarchive.org/release-group/${releaseGroup}`);
            if (caaRes.ok) {
                const caaJson = await caaRes.json();
                url = caaJson.release ?? "";
                for (const image of caaJson.images) {
                    imageUrl = image.thumbnails.large || "";
                    if (imageUrl) break;
                }
            }
        }

        return {
            name: trackMetadata.track_name || "Unknown",
            album: albumName,
            artist: artistName,
            durationMs: trackMetadata.additional_info?.duration_ms,
            recordingMBID: trackMetadata.additional_info?.recording_mbid,
            url,
            imageUrl,
        };
    } catch (e) {
        logger.error("Failed to query ListenBrainz API", e);
        return null;
    }
}

function getLargeImage(track: LbTrackData): string | undefined {
    if (track.imageUrl && !track.imageUrl.includes(PLACEHOLDER_ID)) return track.imageUrl;
    if (settings.store.lb_missingArt === "placeholder") return "placeholder";
}

async function getActivity(): Promise<Activity | null> {
    if (settings.store.lb_hideWithActivity) {
        if (PresenceStore.getActivities().some(a => a.application_id !== APPLICATION_ID)) return null;
    }

    if (settings.store.lb_hideWithSpotify) {
        if (PresenceStore.getActivities().some(a => a.type === ActivityType.LISTENING && a.application_id !== APPLICATION_ID))
            return null;
    }

    const trackData = await fetchTrackData();
    if (!trackData) return null;

    const largeImage = getLargeImage(trackData);
    const assets = largeImage
        ? {
            large_image: await getAsset(largeImage),
            large_text: trackData.album || undefined,
            small_image: settings.store.lb_useLogo ? await getAsset("listenbrainz") : undefined,
            small_text: "ListenBrainz",
        }
        : {
            large_image: await getAsset("listenbrainz"),
            large_text: trackData.album || undefined,
        };

    const buttons: ActivityButton[] = [];
    if (settings.store.lb_shareUsername)
        buttons.push({ label: "ListenBrainz Profile", url: `https://www.listenbrainz.org/user/${settings.store.lb_username}` });
    if (settings.store.lb_shareSong && trackData.url)
        buttons.push({ label: "View Song", url: trackData.url });

    const statusName = (() => {
        switch (settings.store.lb_nameFormat) {
            case NameFormat.ArtistFirst: return trackData.artist + " - " + trackData.name;
            case NameFormat.SongFirst: return trackData.name + " - " + trackData.artist;
            case NameFormat.ArtistOnly: return trackData.artist;
            case NameFormat.SongOnly: return trackData.name;
            case NameFormat.AlbumName: return trackData.album || settings.store.lb_statusName;
            default: return settings.store.lb_statusName;
        }
    })();

    if (trackData.recordingMBID && trackData.recordingMBID !== currentRecordingMBID) {
        currentRecordingMBID = trackData.recordingMBID;
        currentStart = Date.now();
    }

    return {
        application_id: APPLICATION_ID,
        name: statusName,
        details: trackData.name,
        state: trackData.artist,
        assets,
        timestamps: settings.store.lb_useTimeBar && currentStart
            ? { start: currentStart, end: trackData.durationMs ? currentStart + trackData.durationMs : undefined }
            : undefined,
        buttons: buttons.length ? buttons.map(v => v.label) : undefined,
        metadata: buttons.length ? { button_urls: buttons.map(v => v.url) } : undefined,
        type: settings.store.lb_useListeningStatus ? ActivityType.LISTENING : ActivityType.PLAYING,
        flags: ActivityFlags.INSTANCE,
    };
}

async function updatePresence() {
    try {
        setActivity(await getActivity());
    } catch (e) {
        logger.error("Failed to update presence", e);
        setActivity(null);
    }
}

export function start() {
    currentRecordingMBID = "";
    currentStart = 0;
    updatePresence();
    updateInterval = setInterval(updatePresence, 16000);
}

export function stop() {
    clearInterval(updateInterval);
    updateInterval = undefined;
    setActivity(null);
}
