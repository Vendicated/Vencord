/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Sofia Lima
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/settings";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import Logger from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { filters, findByPropsLazy, mapMangledModuleLazy } from "@webpack";
import { FluxDispatcher, Forms } from "@webpack/common";

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

interface TrackData {
    name: string;
    album: string;
    artist: string;
    url: string;
    imageUrl?: string;
}

// only relevant enum values
enum ActivityType {
    PLAYING = 0,
    LISTENING = 2,
}

enum ActivityFlag {
    INSTANCE = 1 << 0,
}

const applicationId = "1043533871037284423";
const placeholderId = "2a96cbd8b46e442fc41c2b86b821562f";

const logger = new Logger("LastFMRichPresence");

const presenceStore = findByPropsLazy("getLocalPresence");
const assetManager = mapMangledModuleLazy(
    "getAssetImage: size must === [number, number] for Twitch",
    {
        getAsset: filters.byCode("apply("),
    }
);

async function getApplicationAsset(key: string): Promise<string> {
    return (await assetManager.getAsset(applicationId, [key, undefined]))[0];
}

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "LastFM",
    });
}

const settings = definePluginSettings({
    username: {
        description: "last.fm username",
        type: OptionType.STRING,
    },
    apiKey: {
        description: "last.fm api key",
        type: OptionType.STRING,
    },
    shareUsername: {
        description: "show link to last.fm profile",
        type: OptionType.BOOLEAN,
        default: false,
    },
    hideWithSpotify: {
        description: "hide last.fm presence if spotify is running",
        type: OptionType.BOOLEAN,
        default: true,
    },
    statusName: {
        description: "text shown in status",
        type: OptionType.STRING,
        default: "some music",
    },
    useListeningStatus: {
        description: 'show "Listening to" status instead of "Playing"',
        type: OptionType.BOOLEAN,
        default: false,
    },
    missingArt: {
        description: "When album or album art is missing",
        type: OptionType.SELECT,
        options: [
            {
                label: "Use large Last.fm logo",
                value: "lastfmLogo",
                default: true
            },
            {
                label: "Use generic placeholder",
                value: "placeholder"
            }
        ],
    }
});

export default definePlugin({
    name: "LastFMRichPresence",
    description: "Little plugin for Last.fm rich presence",
    authors: [Devs.dzshn, Devs.RuiNtD],

    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">How to get an API key</Forms.FormTitle>
            <Forms.FormText>
                An API key is required to fetch your current track. To get one, you can
                visit <Link href="https://www.last.fm/api/account/create">this page</Link> and
                fill in the following information: <br /> <br />

                Application name: Discord Rich Presence <br />
                Application description: (personal use) <br /> <br />

                And copy the API key (not the shared secret!)
            </Forms.FormText>
        </>
    ),

    settings,

    start() {
        this.updateInterval = setInterval(() => { this.updatePresence(); }, 16000);
    },

    stop() {
        clearInterval(this.updateInterval);
    },

    async fetchTrackData(): Promise<TrackData | null> {
        if (!settings.store.username || !settings.store.apiKey)
            return null;

        try {
            const params = new URLSearchParams({
                method: "user.getrecenttracks",
                api_key: settings.store.apiKey,
                user: settings.store.username,
                limit: "1",
                format: "json"
            });

            const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
            if (!res.ok) throw `${res.status} ${res.statusText}`;

            const json = await res.json();
            if (json.error) {
                logger.error("Error from Last.fm API", `${json.error}: ${json.message}`);
                return null;
            }

            const trackData = json.recenttracks?.track[0];

            if (!trackData || !trackData["@attr"]?.nowplaying)
                return null;

            // why does the json api have xml structure
            return {
                name: trackData.name || "Unknown",
                album: trackData.album["#text"],
                artist: trackData.artist["#text"] || "Unknown",
                url: trackData.url,
                imageUrl: trackData.image?.find((x: any) => x.size === "large")?.["#text"]
            };
        } catch (e) {
            logger.error("Failed to query Last.fm API", e);
            // will clear the rich presence if API fails
            return null;
        }
    },

    async updatePresence() {
        setActivity(await this.getActivity());
    },

    getLargeImage(track: TrackData): string | undefined {
        if (track.imageUrl && !track.imageUrl.includes(placeholderId))
            return track.imageUrl;

        if (settings.store.missingArt === "placeholder")
            return "placeholder";
    },

    async getActivity(): Promise<Activity | null> {
        if (settings.store.hideWithSpotify) {
            for (const activity of presenceStore.getActivities()) {
                if (activity.type === ActivityType.LISTENING && activity.application_id !== applicationId) {
                    // there is already music status because of Spotify or richerCider (probably more)
                    return null;
                }
            }
        }

        const trackData = await this.fetchTrackData();
        if (!trackData) return null;

        const largeImage = this.getLargeImage(trackData);
        const assets: ActivityAssets = largeImage ?
            {
                large_image: await getApplicationAsset(largeImage),
                large_text: trackData.album || undefined,
                small_image: await getApplicationAsset("lastfm-small"),
                small_text: "Last.fm",
            } : {
                large_image: await getApplicationAsset("lastfm-large"),
                large_text: trackData.album || undefined,
            };

        const buttons: ActivityButton[] = [
            {
                label: "View Song",
                url: trackData.url,
            },
        ];

        if (settings.store.shareUsername)
            buttons.push({
                label: "Last.fm Profile",
                url: `https://www.last.fm/user/${settings.store.username}`,
            });

        return {
            application_id: applicationId,
            name: settings.store.statusName,

            details: trackData.name,
            state: trackData.artist,
            assets,

            buttons: buttons.map(v => v.label),
            metadata: {
                button_urls: buttons.map(v => v.url),
            },

            type: settings.store.useListeningStatus ? ActivityType.LISTENING : ActivityType.PLAYING,
            flags: ActivityFlag.INSTANCE,
        };
    }
});
