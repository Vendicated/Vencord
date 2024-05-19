/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ApplicationAssetUtils, FluxDispatcher, Forms, React } from "@webpack/common";

interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface Activity {
    state?: string;
    details?: string;
    timestamps?: {
        start?: number;
        end?: number;
    };
    assets?: ActivityAssets;
    buttons?: Array<string>;
    name: string;
    application_id: string;
    metadata?: {
        button_urls?: Array<string>;
    };
    type: ActivityType;
    url?: string;
    flags: number;
}

interface Data {
    activity: Activity;
    pid?: number;
    socketId: string;
    type: string;
}


const enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    COMPETING = 5
}

interface SpotifyImage {
    height: number;
    width: number;
    url: string;
}

interface SpotifyElement {
    id: string;
    name: string;
    // track, album or artist
    type: string;
    // only on track
    duration?: number;
    album?: SpotifyElement;
    artists?: Array<SpotifyElement>;
    isLocal?: boolean;
    // only on album
    image?: SpotifyImage;
    // only on artist
    external_urls?: {
        spotify: string;
    };
    href?: string;
    uri?: string;
}

interface SpotifyEvent {
    type: string;
    track: SpotifyElement;
    connectionId: string;
}

interface SpotifyDevice {
    id: string;
    is_active: boolean;
    is_private_session: boolean;
    is_restricted: boolean;
    name: string;
    supports_volume: boolean;
    type: string;
    volume_percent: number;
}


const settings = definePluginSettings({
    applicationId: {
        type: OptionType.STRING,
        description: "Application ID (required)",
        isValid: (value: string) => {
            if (!value) return "Application ID is required.";
            if (value && !/^\d+$/.test(value)) return "Application ID must be a number.";
            return true;
        }
    },
    musicPlayerNames: {
        type: OptionType.STRING,
        default: "Music",
        description: "List of activity names which will get replaced by the song's title (separated by ,)",
        restartNeeded: false
    },
    forceListeningType: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Force all music player activities to be \"Listening to\", instead of \"Playing\"",
        restartNeeded: false
    },
    cloneSpotifyActivity: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Clone Spotify's activity to give it the custom name. Does not remove the original one.",
        restartNeeded: true
    }
});


function handleUpdate(data: Data) {
    if (data.activity === null || data.activity.state === undefined) return;

    const players = settings.store.musicPlayerNames.split(",").map(x => x.trim());
    if (!players.includes(data.activity.name)) return;

    if (settings.store.forceListeningType) {
        data.activity.type = ActivityType.LISTENING;
    }

    if (data.activity.details !== undefined) {
        data.activity.name = data.activity.details;
    }
}

async function start() {
    FluxDispatcher.subscribe("LOCAL_ACTIVITY_UPDATE", handleUpdate);
}

async function stop() {
    FluxDispatcher.unsubscribe("LOCAL_ACTIVITY_UPDATE", handleUpdate);
}

var playbackStoppedTimeout: number | undefined;

export default definePlugin({
    name: "MusicTitleRPC",
    description: "Makes the song's title appear as the activity name when listening to music.",
    authors: [Devs.Blackilykat],
    start: start,
    stop: stop,
    patches: [
        {
            find: "){let{connectionId:",
            predicate: () => settings.store.cloneSpotifyActivity,
            replacement: [
                {
                    match: /(?=let{connectionId:\i,track:\i}=(\i);)/,
                    replace: "$self.handleSpotifySongChange($1);"
                }
            ]
        },
        {
            find: "SPOTIFY_SET_DEVICES:function(",
            predicate: () => settings.store.cloneSpotifyActivity,
            replacement: [
                {
                    match: /(?<=SPOTIFY_SET_DEVICES:function\((\i)\){)/,
                    replace: "$self.handleSpotifyChangeDevices($1);"
                }
            ]
        }
    ],
    settings,

    async handleSpotifyChangeDevices(e: { accountId: string, devices: SpotifyDevice[]; }) {
        const { devices } = e;
        let playing: boolean = false;
        devices.forEach(device => {
            if (device.is_active) playing = true;
        });
        if (!playing) {
            FluxDispatcher.dispatch({
                type: "LOCAL_ACTIVITY_UPDATE",
                activity: null,
                socketId: "MusicTitleRPC:Spotify"
            });
        }
    },

    async handleSpotifySongChange(e: SpotifyEvent) {
        const { applicationId: application_id } = settings.store;
        if (application_id === undefined) return;

        let large_image: string | undefined = undefined;
        if (e.track.album?.image?.url !== undefined) {
            large_image = (await ApplicationAssetUtils.fetchAssetIds(application_id, [e.track.album.image.url]))[0];
        }
        const activity: Activity = {
            application_id,
            name: e.track.name,
            type: ActivityType.LISTENING,
            flags: 0,
            details: e.track.name,
            state: `by ${e.track.artists?.map(x => x.name)?.join(", ")}`,
            timestamps: {
                start: Date.now(),
                end: (Date.now() + (e.track.duration ?? 0))
            },
            assets: {
                large_image,
                large_text: `on ${e.track.album?.name}`
            },
            buttons: [
                "Open in Spotify"
            ],
            metadata: {
                button_urls: [
                    `https://open.spotify.com/track/${e.track.id}`
                ]
            }
        };
        FluxDispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            activity: activity,
            socketId: "MusicTitleRPC:Spotify"
        });

        if (playbackStoppedTimeout) clearTimeout(playbackStoppedTimeout);
        playbackStoppedTimeout = window.setTimeout(() => {
            FluxDispatcher.dispatch({
                type: "LOCAL_ACTIVITY_UPDATE",
                activity: null,
                socketId: "MusicTitleRPC:Spotify"
            });
        }, (e.track.duration ?? 0) + 5000);
    },

    settingsAboutComponent: () => {
        return (
            <React.Fragment>
                <Forms.FormTitle tag="h3">Getting the Application ID</Forms.FormTitle>
                <Forms.FormText variant="text-md/normal">
                    To get your application ID, go to the <Link href="https://discord.com/developers/applications">Discord Developer Portal</Link> and create an application.
                </Forms.FormText>
                <Forms.FormText variant="text-md/normal">
                    If you already created one for CustomRPC, you can use the same ID here.
                </Forms.FormText>
                <br />
                <Forms.FormTitle tag="h3">For spotify users</Forms.FormTitle>
                <Forms.FormText variant="text-md/normal">
                    If you use spotify, make sure to disable <code>Settings</code> &gt; <code>Connections</code> &gt; <code>Display Spotify as your status</code>. Keeping it enabled will result in two activities showing up.
                </Forms.FormText>
                <br />
                <Forms.FormText variant="text-md/normal">
                    The new activity this plugin creates will be missing some features (time bar, play on spotify and listen along). This is a compromise, not a bug.
                </Forms.FormText>
            </React.Fragment>
        );
    },

});
