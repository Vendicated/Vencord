/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// alot of the code is from LastFMRichPresence
import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { ApplicationAssetUtils, FluxDispatcher, Forms, showToast } from "@webpack/common";


interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface Activity {
    state: string;
    details?: string;
    timestamps?: {
        start?: number;
    };
    assets?: ActivityAssets;
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

export default definePlugin({
    name: "JellyfinRichPresence",
    description: "Rich presence for Jellyfin media server",
    authors: [EquicordDevs.vmohammad],

    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">How to get an API key</Forms.FormTitle>
            <Forms.FormText>
                An API key is required to fetch your current media. To get one, go to your
                Jellyfin dashboard, navigate to Administration {">"} API Keys and
                create a new API key. <br /> <br />

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
        const mediaData = await this.fetchMediaData();
        if (!mediaData) return null;

        const largeImage = mediaData.imageUrl;
        const assets: ActivityAssets = {
            large_image: largeImage ? await getApplicationAsset(largeImage) : await getApplicationAsset("jellyfin"),
            large_text: mediaData.album || mediaData.seriesName || undefined,
        };

        const getDetails = () => {
            if (mediaData.type === "Episode" && mediaData.seriesName) {
                return mediaData.name;
            }
            return mediaData.name;
        };

        const getState = () => {
            if (mediaData.type === "Episode" && mediaData.seriesName) {
                const season = mediaData.seasonNumber ? `S${mediaData.seasonNumber}` : "";
                const episode = mediaData.episodeNumber ? `E${mediaData.episodeNumber}` : "";
                return `${mediaData.seriesName} ${season}${episode}`.trim();
            }
            return mediaData.artist || (mediaData.year ? `(${mediaData.year})` : undefined);
        };

        const timestamps = mediaData.position && mediaData.duration ? {
            start: Date.now() - (mediaData.position * 1000),
            end: Date.now() + ((mediaData.duration - mediaData.position) * 1000)
        } : undefined;

        return {
            application_id: applicationId,
            name: "Jellyfin",

            details: getDetails(),
            state: getState() || "something",
            assets,
            timestamps,

            type: 3,
            flags: 1,
        };
    }
});
