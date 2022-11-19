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

import { Devs } from "../utils/constants";
import { lazyWebpack } from "../utils/misc";
import definePlugin, { OptionType } from "../utils/types";
import { Settings, Webpack } from "../Vencord";
import { FluxDispatcher, Forms } from "../webpack/common";
import { Link } from "../components/Link";

interface ActivityAssets {
    large_image?: string
    large_text?: string
    small_image?: string
    small_text?: string
}

interface Activity {
    state: string
    details?: string
    timestamps?: {
        start?: Number
    }
    assets?: ActivityAssets
    buttons?: Array<string>
    name: string
    application_id: string
    metadata?: {
        button_urls?: Array<string>
    }
    type: Number
    flags: Number
}

interface TrackData {
    name: string
    album: string
    artist: string
    url: string
    imageUrl?: string
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

const presenceStore = lazyWebpack(Webpack.filters.byProps("getLocalPresence"));
const assetManager = Webpack.mapMangledModuleLazy(
    "getAssetImage: size must === [number, number] for Twitch",
    {
        getAsset: Webpack.filters.byCode("apply("),
    }
);

async function getApplicationAsset(key: string): Promise<string> {
    return (await assetManager.getAsset(applicationId, [key, undefined]))[0];
}

function setActivity(activity?: Activity) {
    FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: activity });
}

export default definePlugin({
    name: "LastFMRichPresence",
    description: "Little plugin for Last.fm rich presence",
    authors: [Devs.dzshn],

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

    options: {
        username: {
            description: "last.fm username",
            type: OptionType.STRING,
        },
        apiKey: {
            description: "last.fm api key",
            type: OptionType.STRING,
        },
        hideWithSpotify: {
            description: "hide last.fm presence if spotify is running",
            type: OptionType.BOOLEAN,
            default: true,
        },
        useListeningStatus: {
            description: "show \"Listening to\" status instead of \"Playing\"",
            type: OptionType.BOOLEAN,
            default: false,
        }
    },

    start() {
        this.settings = Settings.plugins.LastFMRichPresence;

        this.updateInterval = setInterval(() => { this.updatePresence(); }, 16000);
    },

    stop() {
        clearInterval(this.updateInterval);
    },

    async fetchTrackData(): Promise<TrackData | null> {
        if (!this.settings.username || !this.settings.apiKey) return null;

        const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&api_key=${this.settings.apiKey}&user=${this.settings.username}&limit=1&format=json`);
        const trackData = (await response.json()).recenttracks.track[0];

        if (!trackData["@attr"]?.nowplaying) return null;

        // why does the json api have xml structure
        return {
            name: trackData.name || "Unknown",
            album: trackData.album["#text"],
            artist: trackData.artist["#text"] || "Unknown",
            url: trackData.url,
            imageUrl: (trackData.image || []).filter(x => x.size === "large")[0]?.["#text"]
        };
    },

    async updatePresence() {
        if (this.settings.hideWithSpotify) {
            for (const activity of presenceStore.getActivities()) {
                if (activity.type === ActivityType.LISTENING && activity.application_id !== applicationId) {
                    // there is already music status (probably only spotify can do this currently)
                    setActivity();
                    return;
                }
            }
        }

        const trackData = await this.fetchTrackData();

        if (!trackData) {
            setActivity();
            return;
        }

        const hideAlbumName = !trackData.album || trackData.album === trackData.name;

        let assets: ActivityAssets;
        if (trackData.imageUrl) {
            assets = {
                large_image: await getApplicationAsset(trackData.imageUrl),
                large_text: trackData.name,
                small_image: await getApplicationAsset("lastfm-small"),
                small_text: "Last.fm",
            };
        } else {
            assets = {
                large_image: await getApplicationAsset("lastfm-large"),
                large_text: "Last.fm",
            };
        }

        setActivity({
            application_id: applicationId,
            name: "some music",

            details: trackData.name,
            state: hideAlbumName ? trackData.artist : `${trackData.artist} - ${trackData.album}`,
            assets,

            buttons: [ "Open in Last.fm" ],
            metadata: {
                button_urls: [ trackData.url ]
            },

            type: this.settings.useListeningStatus ? ActivityType.LISTENING : ActivityType.PLAYING,
            flags: ActivityFlag.INSTANCE,
        });
    }
});
