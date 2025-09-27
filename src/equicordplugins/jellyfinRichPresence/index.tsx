/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// alot of the code is from LastFMRichPresence
import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { ApplicationAssetUtils, FluxDispatcher, Forms, showToast } from "@webpack/common";


interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface ActivityButton {
    label: string;
    url: string;
}

interface Activity {
    state: string;
    details?: string;
    timestamps?: {
        start?: number;
    };
    assets?: ActivityAssets;
    buttons?: Array<string>;
    name: string;
    application_id: string;
    metadata?: {
        button_urls?: Array<string>;
    };
    type: number;
    flags: number;
}

interface MediaData {
    name: string;
    type: string;
    artist?: string;
    album?: string;
    seriesName?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    year?: number;
    url?: string;
    imageUrl?: string;
    duration?: number;
    position?: number;
}

const settings = definePluginSettings({
    serverUrl: {
        description: "Jellyfin server URL (e.g., https://jellyfin.example.com)",
        type: OptionType.STRING,
    },
    apiKey: {
        description: "Jellyfin API key obtained from your Jellyfin administration dashboard",
        type: OptionType.STRING,
    },
    userId: {
        description: "Jellyfin user ID obtained from your user profile URL",
        type: OptionType.STRING,
    },
    nameDisplay: {
        description: "Choose how the application name should appear in Rich Presence",
        type: OptionType.SELECT,
        options: [
            { label: "Series/Movie Name", value: "default", default: true },
            { label: "Series - Episode/Track/Movie Name", value: "full" },
            { label: "Custom", value: "custom" },
        ],
    },
    customName: {
        description: "Custom Rich Presence name (only used if 'Custom' is selected).\nOptions: {name}, {series}, {season}, {episode}, {artist}, {album}, {year}",
        type: OptionType.STRING,
    },
    showTMDBButton: {
        description: "Show TheMovieDB button in Rich Presence",
        type: OptionType.BOOLEAN,
        default: true,
    },
    posterSource: {
        description: "Choose which poster to display in Rich Presence",
        type: OptionType.SELECT,
        options: [
            { label: "Jellyfin", value: "jellyfin", default: true },
            { label: "TheMovieDB", value: "tmdb" },
        ],
    },
    overrideRichPresenceType: {
        description: "Override the rich presence type",
        type: OptionType.SELECT,
        options: [
            {
                label: "Off",
                value: false,
                default: true,
            },
            {
                label: "Listening",
                value: 2,
            },
            {
                label: "Playing",
                value: 0,
            },
            {
                label: "Streaming",
                value: 1,
            },
            {
                label: "Watching",
                value: 3
            },
        ],
    },
});

const applicationId = "1381368130164625469";

const logger = new Logger("JellyfinRichPresence");

async function getApplicationAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(applicationId, [key]))[0];
}

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "Jellyfin",
    });
}

async function fetchTmdbData(query: string) {
    try {
        const res = await fetch(`https://api.vmohammad.dev/tmdb/search/multi?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw `${res.status} ${res.statusText}`;
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const topResult = data.results[0];
            return {
                url: `https://www.themoviedb.org/${topResult.media_type}/${topResult.id}`,
                posterPath: topResult.poster_path
                    ? `https://image.tmdb.org/t/p/original${topResult.poster_path}`
                    : null
            };
        }
        return null;
    } catch (e) {
        console.error("Failed to fetch TMDb data:", e);
        return null;
    }
}

export default definePlugin({
    name: "JellyfinRichPresence",
    description: "Rich presence for Jellyfin media server",
    authors: [EquicordDevs.vmohammad, Devs.SerStars],

    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">How to get an API key</Forms.FormTitle>
            <Forms.FormText>
                Auth token can be found by following these steps:
                <ol style={{ marginTop: 8, marginBottom: 8, paddingLeft: 20 }}>
                    <li>1. Log into your Jellyfin instance</li>
                    <li>2. Open your browser's Developer Tools (usually F12 or right-click then Inspect)</li>
                    <li>3. Go to the <b>Network</b> tab in Developer Tools</li>
                    <li>4. Look for requests to your Jellyfin server</li>
                    <li>
                        5. In the request headers, find <code>X-MediaBrowser-Token</code> or <code>Authorization</code>
                        <br />
                        <i>
                            Easiest way: press <b>Ctrl+F</b> in the Developer Tools and search for <code>X-MediaBrowser-Token</code>
                        </i>
                    </li>
                </ol>
                <br />
                You'll also need your User ID, which can be found in the url of your user profile page.
            </Forms.FormText>
        </>
    ),

    settings,

    start() {
        this.updatePresence();
        this.updateInterval = setInterval(() => { this.updatePresence(); }, 10000);
    },

    stop() {
        clearInterval(this.updateInterval);
    },

    async fetchMediaData(): Promise<MediaData | null> {
        if (!settings.store.serverUrl || !settings.store.apiKey || !settings.store.userId) {
            logger.warn("Jellyfin server URL, API key, or user ID is not set in settings.");
            showToast("JellyfinRPC is not configured.", "failure", {
                duration: 15000,
            });
            return null;
        }

        try {
            const baseUrl = settings.store.serverUrl.replace(/\/$/, "");
            const url = `${baseUrl}/Sessions?api_key=${settings.store.apiKey}`;

            const res = await fetch(url);
            if (!res.ok) throw `${res.status} ${res.statusText}`;

            const sessions = await res.json();
            const userSession = sessions.find((session: any) =>
                session.UserId === settings.store.userId && session.NowPlayingItem
            );

            if (!userSession || !userSession.NowPlayingItem) return null;

            const item = userSession.NowPlayingItem;
            const playState = userSession.PlayState;

            if (playState?.IsPaused) return null;

            const imageUrl = item.ImageTags?.Primary
                ? `${baseUrl}/Items/${item.Id}/Images/Primary`
                : undefined;

            return {
                name: item.Name || "Unknown",
                type: item.Type,
                artist: item.Artists?.[0] || item.AlbumArtist,
                album: item.Album,
                seriesName: item.SeriesName,
                seasonNumber: item.ParentIndexNumber,
                episodeNumber: item.IndexNumber,
                year: item.ProductionYear,
                url: `${baseUrl}/web/#!/details?id=${item.Id}`,
                imageUrl,
                duration: item.RunTimeTicks ? Math.floor(item.RunTimeTicks / 10000000) : undefined,
                position: playState?.PositionTicks ? Math.floor(playState.PositionTicks / 10000000) : undefined
            };
        } catch (e) {
            logger.error("Failed to query Jellyfin API", e);
            return null;
        }
    },

    async updatePresence() {
        setActivity(await this.getActivity());
    },

    async getActivity(): Promise<Activity | null> {
        let richPresenceType;
        let appName: string;
        const nameSetting = settings.store.nameDisplay || "default";

        const mediaData = await this.fetchMediaData();
        if (!mediaData) return null;

        if (settings.store.overrideRichPresenceType) {
            richPresenceType = settings.store.overrideRichPresenceType;
        } else {
            switch (mediaData.type) {
                case "Audio":
                    richPresenceType = 2;
                    break;
                default:
                    richPresenceType = 3;
                    break;
            }
        }

        const templateReplace = (template: string) => {
            return template
                .replace(/\{name\}/g, mediaData.name || "")
                .replace(/\{series\}/g, mediaData.seriesName || "")
                .replace(/\{season\}/g, mediaData.seasonNumber?.toString() || "")
                .replace(/\{episode\}/g, mediaData.episodeNumber?.toString() || "")
                .replace(/\{artist\}/g, mediaData.artist || "")
                .replace(/\{album\}/g, mediaData.album || "")
                .replace(/\{year\}/g, mediaData.year?.toString() || "");
        };

        switch (nameSetting) {
            case "full":
                if (mediaData.type === "Episode" && mediaData.seriesName) {
                    appName = `${mediaData.seriesName} - ${mediaData.name}`;
                } else if (mediaData.type === "Audio") {
                    appName = `${mediaData.artist || "Unknown Artist"} - ${mediaData.name}`;
                } else {
                    appName = mediaData.name || "Jellyfin";
                }
                break;
            case "custom":
                appName = templateReplace(settings.store.customName || "{name} on Jellyfish");
                break;
            case "default":
            default:
                if (mediaData.type === "Episode" && mediaData.seriesName) {
                    appName = mediaData.seriesName;
                } else {
                    appName = mediaData.name || "Jellyfin";
                }
                break;
        }

        let tmdbData: { url: string; posterPath?: string | null } | null = null;
        if (settings.store.showTMDBButton) {
            tmdbData = await fetchTmdbData(mediaData.seriesName || mediaData.name);
        }

        const assets: ActivityAssets = {
            large_image:
                settings.store.posterSource === "tmdb"
                    ? (tmdbData?.posterPath
                        ? await getApplicationAsset(tmdbData.posterPath)
                        : undefined)
                    : (mediaData.imageUrl
                        ? await getApplicationAsset(mediaData.imageUrl)
                        : undefined),
            large_text: mediaData.seriesName || mediaData.album || undefined,
        };

        const buttons: ActivityButton[] = [];
        if (settings.store.showTMDBButton) {
            const result = await fetchTmdbData(mediaData.seriesName || mediaData.name);
            if (result?.url) tmdbData = { url: result.url };
            buttons.push({
                label: "View on TheMovieDB",
                url: `${tmdbData?.url}`
            });
        }

        const getDetails = () => {
            if (mediaData.type === "Episode" && mediaData.seriesName) {
                return mediaData.seriesName;
            }
            return mediaData.name;
        };

        const getState = () => {
            if (mediaData.type === "Episode" && mediaData.seriesName) {
                const season = mediaData.seasonNumber ? `S${mediaData.seasonNumber}` : "";
                const episode = mediaData.episodeNumber ? `E${mediaData.episodeNumber}` : "";
                return `${mediaData.name} (${season} - ${episode})`.trim();
            }
            return mediaData.artist || (mediaData.year ? `(${mediaData.year})` : undefined);
        };

        const timestamps = mediaData.position && mediaData.duration ? {
            start: Date.now() - (mediaData.position * 1000),
            end: Date.now() + ((mediaData.duration - mediaData.position) * 1000)
        } : undefined;

        return {
            application_id: applicationId,
            name: appName,
            details: getDetails(),
            state: getState() || "something",
            assets,
            timestamps,

            buttons: buttons.length ? buttons.map(v => v.label) : undefined,
            metadata: {
                button_urls: buttons.map(v => v.url),
            },
            type: richPresenceType,
            flags: 1
        };
    }
});
