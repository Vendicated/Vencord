/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// alot of the code is from JellyfinRPC
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
    author?: string;
    series?: string;
    duration?: number;
    currentTime?: number;
    progress?: number;
    url?: string;
    imageUrl?: string;
    isFinished?: boolean;
}



const settings = definePluginSettings({
    serverUrl: {
        description: "AudioBookShelf server URL (e.g., https://abs.example.com)",
        type: OptionType.STRING,
    },
    username: {
        description: "AudioBookShelf username",
        type: OptionType.STRING,
    },
    password: {
        description: "AudioBookShelf password",
        type: OptionType.STRING,
    },
});

const applicationId = "1381423044907503636";

const logger = new Logger("AudioBookShelfRichPresence");

let authToken: string | null = null;

async function getApplicationAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(applicationId, [key]))[0];
}

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "ABSRPC",
    });
}

export default definePlugin({
    name: "AudioBookShelfRichPresence",
    description: "Rich presence for AudioBookShelf media server",
    authors: [EquicordDevs.vmohammad],

    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">How to connect to AudioBookShelf</Forms.FormTitle>
            <Forms.FormText>
                Enter your AudioBookShelf server URL, username, and password to display your currently playing audiobooks as Discord Rich Presence.
                <br /><br />
                The plugin will automatically authenticate and fetch your listening progress.
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

    async authenticate(): Promise<boolean> {
        if (!settings.store.serverUrl || !settings.store.username || !settings.store.password) {
            logger.warn("AudioBookShelf server URL, username, or password is not set in settings.");
            showToast("AudioBookShelf RPC is not configured.", "failure", {
                duration: 15000,
            });
            return false;
        }

        try {
            const baseUrl = settings.store.serverUrl.replace(/\/$/, "");
            const url = `${baseUrl}/login`;

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: settings.store.username,
                    password: settings.store.password,
                }),
            });

            if (!res.ok) throw `${res.status} ${res.statusText}`;

            const data = await res.json();
            authToken = data.user?.token;
            return !!authToken;
        } catch (e) {
            logger.error("Failed to authenticate with AudioBookShelf", e);
            authToken = null;
            return false;
        }
    },

    async fetchMediaData(): Promise<MediaData | null> {
        if (!authToken && !(await this.authenticate())) {
            return null;
        }

        const isPlayingNow = session => {
            const now = Date.now();
            const lastUpdate = session.updatedAt;
            const diffSeconds = (now - lastUpdate) / 1000;
            return diffSeconds <= 30;
        };
        try {
            const baseUrl = settings.store.serverUrl!.replace(/\/$/, "");
            const url = `${baseUrl}/api/me/listening-sessions`;

            const res = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${authToken}`,
                },
            });

            if (!res.ok) {
                if (res.status === 401) {
                    authToken = null;
                    if (await this.authenticate()) {
                        return this.fetchMediaData();
                    }
                }
                throw `${res.status} ${res.statusText}`;
            }

            const { sessions } = await res.json();
            const activeSession = sessions.find((session: any) =>
                session.updatedAt && !session.isFinished
            );

            if (!activeSession || !isPlayingNow(activeSession)) return null;

            const { mediaMetadata: media, mediaType, duration, currentTime, libraryItemId } = activeSession;
            if (!media) return null;
            console.log(media);
            return {
                name: media.title || "Unknown",
                type: mediaType || "book",
                author: media.author || media.publisher,
                series: media.series[0]?.name,
                duration,
                currentTime,
                imageUrl: libraryItemId ? `${baseUrl}/api/items/${libraryItemId}/cover` : undefined,
                isFinished: activeSession.isFinished || false,
            };
        } catch (e) {
            logger.error("Failed to query AudioBookShelf API", e);
            return null;
        }
    },

    async updatePresence() {
        setActivity(await this.getActivity());
    },

    async getActivity(): Promise<Activity | null> {
        const mediaData = await this.fetchMediaData();
        if (!mediaData || mediaData.isFinished) return null;

        const largeImage = mediaData.imageUrl;
        console.log("Large Image URL:", largeImage);
        const assets: ActivityAssets = {
            large_image: largeImage ? await getApplicationAsset(largeImage) : await getApplicationAsset("audiobookshelf"),
            large_text: mediaData.series || mediaData.author || undefined,
        };

        const getDetails = () => {
            return mediaData.name;
        };

        const getState = () => {
            if (mediaData.series && mediaData.author) {
                return `${mediaData.series} • ${mediaData.author}`;
            }
            return mediaData.author || "AudioBook";
        };

        const timestamps = mediaData.currentTime && mediaData.duration ? {
            start: Date.now() - (mediaData.currentTime * 1000),
            end: Date.now() + ((mediaData.duration - mediaData.currentTime) * 1000)
        } : undefined;

        return {
            application_id: applicationId,
            name: "AudioBookShelf",

            details: getDetails(),
            state: getState(),
            assets,
            timestamps,

            type: 2,
            flags: 1,
        };
    }
});
