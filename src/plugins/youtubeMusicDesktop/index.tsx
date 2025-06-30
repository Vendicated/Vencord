/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Marco Sin and contributors
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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ApplicationAssetUtils, FluxDispatcher, Forms } from "@webpack/common";
import { Link } from "@components/Link";

// Begin Shamelessly borrowing from the LastFM plugin
const enum NameFormat {
    StatusName = "status-name",
    ArtistFirst = "artist-first",
    SongFirst = "song-first",
    ArtistOnly = "artist",
    SongOnly = "song",
    AlbumName = "album"
}

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
    timestamps: {
        start: number;
        end: number;
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
    imageUrl: string;
    timeElapsed: number;
    songLength: number;
    isPaused: boolean;
}

const enum ActivityFlag {
    INSTANCE = 1 << 0,
}

const settings = definePluginSettings({
    username: {
        description: "YouTube username",
        type: OptionType.STRING,
    },
    statusName: {
        description: "custom status text",
        type: OptionType.STRING,
        default: "some music",
    },
    hideWithActivity: {
        description: "Hide YouTube Music desktop presence if you have any other presence",
        type: OptionType.BOOLEAN,
        default: false,
    },
    nameFormat: {
        description: "Show name of song and artist in status name",
        type: OptionType.SELECT,
        options: [
            {
                label: "Use custom status name",
                value: NameFormat.StatusName,
                default: true
            },
            {
                label: "Use format 'artist - song'",
                value: NameFormat.ArtistFirst
            },
            {
                label: "Use format 'song - artist'",
                value: NameFormat.SongFirst
            },
            {
                label: "Use artist name only",
                value: NameFormat.ArtistOnly
            },
            {
                label: "Use song name only",
                value: NameFormat.SongOnly
            }
        ],
    },
    port: {
        description: "The port used in your YouTube Music Desktop API server settings",
        type: OptionType.STRING,
    },
});

async function getApplicationAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(applicationID, [key]))[0];
}

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "YTM RPC",
    });
}
// End Shamelessly borrowed from the LastFM plugin


const applicationID = "1388976160968278026";
const logger = new Logger("YTMDesktopRPC");
const PresenceStore = findByPropsLazy("getLocalPresence");

export default definePlugin({
    name: "YouTube Music Desktop RPC",
    description: "A YouTube Music Desktop RPC plugin",
    authors: [Devs.MarcoSin42],
    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">How to setup the YouTube Music Desktop RPC</Forms.FormTitle>
            <Forms.FormText>
                Firstly, you must have YouTube music Desktop installed.
                You can find it <Link href="https://ytmdesktop.app/#download">here.</Link> <br /> <br />

                Open YouTube music desktop and enable the API server, it should be under the plugins menu. Then set the hostname to 127.0.0.1 and the port to whatever free port you have.
                Then, disable authorization.

                Return to Vesktop and set the port for the plugin.
            </Forms.FormText>
        </>
    ),
    settings,

    start() {
        this.updatePresence();
        this.updateInterval = setInterval(() => { this.updatePresence(); }, 5000);
    },

    stop() {
        clearInterval(this.updateInterval);
    },

    async fetchTrackData(): Promise<TrackData | null> {
        if (!settings.store.port)
            return null;

        try {
            const res = await fetch(`http://127.0.0.1:${settings.store.port}/api/v1/song`);
            if (!res.ok) {
                logger.log("Unable to fetch from local server");
                return null;
            }

            const trackData = await res.json();


            return {
                name: trackData.title,
                album: trackData.album,
                artist: trackData.artist,
                url: "https://www.youtube.com/watch?v=" + trackData.videoId,
                timeElapsed: trackData.elapsedSeconds,
                songLength: trackData.songDuration,
                imageUrl: trackData.imageSrc,
                isPaused: trackData.isPaused,
            };
        } catch (e) {
            logger.error("Failed to query YouTube Music Desktop API", e);
            return null;
        }
    },

    async updatePresence() {
        setActivity(await this.getActivity());
    },

    getSmallImg(largeImgUrl: string): string {
        const imgSizeParam = "=w120-h120-l90-rj";
        const baseUrl = largeImgUrl.split("=")[0];
        return baseUrl + imgSizeParam;
    },


    async getActivity(): Promise<Activity | null> {
        if (settings.store.hideWithActivity && PresenceStore.getActivities().some(a => a.application_id !== applicationID))
            return null;

        const trackData = await this.fetchTrackData();
        if (!trackData || trackData.isPaused) return null;

        const buttons: ActivityButton[] = [];

        const imgUrl: string = trackData.imageUrl;
        const assets: ActivityAssets = {
            large_image: imgUrl,
            large_text: trackData.album,
            small_image: this.getSmallImg(imgUrl),
            small_text: trackData.album
        };

        buttons.push({
            label: "Listen on YouTube",
            url: trackData.url,
        });

        const statusName = (() => {
            switch (settings.store.nameFormat) {
                case NameFormat.ArtistFirst:
                    return trackData.artist + " - " + trackData.name;
                case NameFormat.SongFirst:
                    return trackData.name + " - " + trackData.artist;
                case NameFormat.ArtistOnly:
                    return trackData.artist;
                case NameFormat.SongOnly:
                    return trackData.name;
                case NameFormat.AlbumName:
                    return trackData.album || settings.store.statusName;
                default:
                    return settings.store.statusName;
            }
        })();

        // TODO:  Would like to get a time elapsed similar to Spotify's rich presence. This is unfortunately not currently working.
        const unixTimestampInMilli: number = Date.now();
        return {
            application_id: applicationID,
            name: statusName,
            timestamps: {
                start: unixTimestampInMilli - trackData.timeElapsed * 1000,
                end: unixTimestampInMilli + (trackData.songLength - trackData.timeElapsed) * 1000,
            },
            details: trackData.name,
            state: trackData.artist,
            assets,

            buttons: buttons.length ? buttons.map(v => v.label) : undefined,
            metadata: {
                button_urls: buttons.map(v => v.url),
            },

            type: 2,
            flags: ActivityFlag.INSTANCE,
        };
    },
});
