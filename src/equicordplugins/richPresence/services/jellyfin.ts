/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { formatDurationMs } from "@utils/text";
import { Activity } from "@vencord/discord-types";
import { ApplicationAssetUtils, FluxDispatcher, showToast } from "@webpack/common";

import { settings } from "../settings";
import { JfMediaData, JfSession } from "../types/jellyfin";

const APPLICATION_ID = "1381368130164625469";
const SOCKET_ID = "RichPresence_JF";
const logger = new Logger("RichPresence:Jellyfin");

let updateInterval: NodeJS.Timeout | undefined;
let hasShownError = false;

async function getAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(APPLICATION_ID, [key]))[0];
}

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity, socketId: SOCKET_ID });
}

async function fetchMediaData(): Promise<JfMediaData | null> {
    const { jf_serverUrl, jf_apiKey, jf_userId } = settings.store;
    if (!jf_serverUrl || !jf_apiKey || !jf_userId) {
        if (!hasShownError) {
            logger.warn("Jellyfin server URL, API key, or user ID is not set.");
            showToast("Jellyfin RPC is not configured.", "failure", { duration: 15000 });
            hasShownError = true;
        }
        return null;
    }

    try {
        const baseUrl = (jf_serverUrl.startsWith("http") ? jf_serverUrl : `https://${jf_serverUrl}`).replace(/\/$/, "");
        const res = await fetch(`${baseUrl}/Sessions?api_key=${jf_apiKey}`);
        if (!res.ok) throw `${res.status} ${res.statusText}`;

        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
        if (!hasShownError) {
            logger.error("Jellyfin returned non-JSON response. Check your server URL and API key.");
            showToast("Jellyfin returned an invalid response. Your API key may be wrong.", "failure", { duration: 15000 });
            hasShownError = true;
        }
            return null;
        }

        const sessions: JfSession[] = await res.json();
        const userSession = sessions.find(s => s.UserId === jf_userId && s.NowPlayingItem);
        if (!userSession?.NowPlayingItem) return null;

        const item = userSession.NowPlayingItem;
        const playState = userSession.PlayState;

        if (playState?.IsPaused && !settings.store.jf_showPausedState) return null;

        const imageUrl = item.ImageTags?.Primary
            ? `${baseUrl}/Items/${item.Type === "Episode" && item.SeriesId && settings.store.jf_coverType === "series"
                ? item.SeriesId : item.Id}/Images/Primary`
            : undefined;

        return {
            name: item.Name || "Unknown",
            type: item.Type || "Unknown",
            artist: item.Artists?.[0] || item.AlbumArtist,
            album: item.Album,
            seriesName: item.SeriesName,
            seasonNumber: item.ParentIndexNumber,
            episodeNumber: item.IndexNumber,
            year: item.ProductionYear,
            url: `${baseUrl}/web/#!/details?id=${item.Id}`,
            imageUrl,
            duration: item.RunTimeTicks ? Math.floor(item.RunTimeTicks / 10000000) : undefined,
            position: playState?.PositionTicks ? Math.floor(playState.PositionTicks / 10000000) : undefined,
            isPaused: !!playState?.IsPaused,
        };
    } catch (e) {
        logger.error("Failed to query Jellyfin API", e);
        return null;
    }
}

async function getActivity(): Promise<Activity | null> {
    const { store } = settings;
    const mediaData = await fetchMediaData();
    if (!mediaData) return null;

    let richPresenceType: number;
    if (store.jf_overrideType !== "off") {
        richPresenceType = parseInt(store.jf_overrideType as string, 10);
    } else {
        richPresenceType = mediaData.type === "Audio" ? 2 : 3;
    }

    const templateReplace = (template: string) =>
        template
            .replace(/\{name\}/g, mediaData.name || "")
            .replace(/\{series\}/g, mediaData.seriesName || "")
            .replace(/\{season\}/g, mediaData.seasonNumber?.toString() || "")
            .replace(/\{episode\}/g, mediaData.episodeNumber?.toString() || "")
            .replace(/\{artist\}/g, mediaData.artist || "")
            .replace(/\{album\}/g, mediaData.album || "")
            .replace(/\{year\}/g, mediaData.year?.toString() || "");

    let appName: string;
    const nameSetting = store.jf_nameDisplay || "default";

    switch (nameSetting) {
        case "full":
            if (mediaData.type === "Episode" && mediaData.seriesName) {
                appName = store.jf_privacyMode
                    ? `${mediaData.seriesName} - [Episode Hidden]`
                    : `${mediaData.seriesName} - ${mediaData.name}`;
            } else if (mediaData.type === "Audio") {
                appName = store.jf_privacyMode
                    ? "[Track Hidden]"
                    : `${mediaData.artist || "Unknown Artist"} - ${mediaData.name}`;
            } else {
                appName = store.jf_privacyMode ? "[Movie Hidden]" : mediaData.name || "Jellyfin";
            }
            break;
        case "custom":
            appName = templateReplace(store.jf_customName || "{name} on Jellyfin");
            if (store.jf_privacyMode) {
                appName = appName
                    .replace(mediaData.name || "", "[Title Hidden]")
                    .replace(mediaData.seriesName || "", "[Series Hidden]")
                    .replace(mediaData.artist || "", "[Artist Hidden]")
                    .replace(mediaData.album || "", "[Album Hidden]");
            }
            break;
        default:
            if (mediaData.type === "Episode" && mediaData.seriesName) {
                appName = mediaData.seriesName;
            } else {
                appName = store.jf_privacyMode ? "[Media Hidden]" : mediaData.name || "Jellyfin";
            }
            break;
    }

    const assets = {
        large_image: !store.jf_privacyMode && mediaData.imageUrl
            ? await getAsset(mediaData.imageUrl) : undefined,
        large_text: mediaData.seriesName || mediaData.album || undefined,
    };

    const getDetails = () => {
        let details: string;
        if (mediaData.type === "Episode" && mediaData.seriesName)
            details = store.jf_privacyMode ? "Watching a TV Show" : mediaData.seriesName;
        else
            details = store.jf_privacyMode ? "Watching Something" : mediaData.name;
        if (mediaData.isPaused) details += " - Paused";
        return details;
    };

    const getState = () => {
        let state: string | undefined;

        if (mediaData.type === "Episode" && mediaData.seriesName) {
            let episodeFormat = "";
            const season = mediaData.seasonNumber;
            const episode = mediaData.episodeNumber;
            const format = store.jf_episodeFormat || "long";

            if (season != null && episode != null) {
                switch (format) {
                    case "long":
                        episodeFormat = `S${season.toString().padStart(2, "0")}E${episode.toString().padStart(2, "0")}`;
                        break;
                    case "short":
                        episodeFormat = `${season}x${episode.toString().padStart(2, "0")}`;
                        break;
                    case "fulltext":
                        episodeFormat = `Season ${season} Episode ${episode}`;
                        break;
                }
            } else if (season != null) {
                episodeFormat = format === "fulltext" ? `Season ${season}` : `S${season.toString().padStart(2, "0")}`;
            } else if (episode != null) {
                episodeFormat = format === "fulltext" ? `Episode ${episode}` : `E${episode.toString().padStart(2, "0")}`;
            }

            state = (store.jf_showEpisodeName && mediaData.name && !store.jf_privacyMode)
                ? `${episodeFormat} - ${mediaData.name}`
                : episodeFormat;
        } else if (store.jf_privacyMode) {
            state = mediaData.type === "Audio" ? "Listening to music" : (mediaData.year ? "(????)" : undefined);
        } else {
            state = mediaData.artist || (mediaData.year ? `(${mediaData.year})` : undefined);
        }

        if (mediaData.isPaused) {
            const time = mediaData.position != null && mediaData.duration != null
                ? `${formatDurationMs(mediaData.position * 1000)} / ${formatDurationMs(mediaData.duration * 1000)}`
                : undefined;
            const parts = [state, time].filter(Boolean);
            return parts.join(" - ") || "Paused";
        }
        return state;
    };

    const timestamps = (!mediaData.isPaused && mediaData.position != null && mediaData.duration != null) ? {
        start: Date.now() - (mediaData.position * 1000),
        end: Date.now() + ((mediaData.duration - mediaData.position) * 1000),
    } : undefined;

    return {
        application_id: APPLICATION_ID,
        name: appName,
        details: getDetails(),
        state: getState() || "something",
        assets,
        timestamps,
        type: richPresenceType,
        flags: 1,
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
    hasShownError = false;
    updatePresence();
    updateInterval = setInterval(updatePresence, 10000);
}

export function stop() {
    clearInterval(updateInterval);
    updateInterval = undefined;
    setActivity(null);
}
