/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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

enum NonSpotifyShowOptions {
    Details,
    State,
    LargeImageText,
    SmallImageText
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
    },
    forceListeningType: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Force all music player activities to be \"Listening to\", instead of \"Playing\"",
    },
    spotifyActivityName: {
        type: OptionType.STRING,
        default: "{{Title}}",
        description: "The activity's name (spotify)"
    },
    spotifyActivityDetails: {
        type: OptionType.STRING,
        default: "{{Title}}",
        description: "The activity's details field (first line) (spotify)"
    },
    spotifyActivityState: {
        type: OptionType.STRING,
        default: "by {{AllArtistsGrammarSeparated}}",
        description: "The activity's state field (second line) (spotify)"
    },
    spotifyActivityLargeImageText: {
        type: OptionType.STRING,
        default: "on {{Album}}",
        description: "The activity's large image text (third line and image hover text) (spotify)"
    },
    spotifyButtonOneText: {
        type: OptionType.STRING,
        default: "Open in Spotify",
        description: "The activity's first button's text (spotify)"
    },
    spotifyButtonTwoText: {
        type: OptionType.STRING,
        default: "",
        description: "The activity's second button's text (spotify)"
    },
    spotifyButtonOneLink: {
        type: OptionType.STRING,
        default: "https://open.spotify.com/track/{{Id}}",
        description: "The activity's first button's link (spotify)"
    },
    spotifyButtonTwoLink: {
        type: OptionType.STRING,
        default: "",
        description: "The activity's second button's link (spotify)"
    },
    nonSpotifyWhatToShow: {
        type: OptionType.SELECT,
        options: [
            { label: "Details", value: NonSpotifyShowOptions.Details, default: true },
            { label: "State", value: NonSpotifyShowOptions.State },
            { label: "Large image text", value: NonSpotifyShowOptions.LargeImageText },
            { label: "Small image text", value: NonSpotifyShowOptions.SmallImageText },
        ],
        description: "What to show (non-spotify)"
    },
    nonSpotifyRegex: {
        type: OptionType.STRING,
        default: "(.+)",
        description: "Regex pattern to determine what to show using the first captured group (non-spotify)"
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
    const { nonSpotifyWhatToShow: what_to_show, nonSpotifyRegex: regex_option } = settings.store;

    const players = settings.store.musicPlayerNames.split(",").map(x => x.trim());
    if (!players.includes(data.activity.name)) return;

    if (settings.store.forceListeningType) {
        data.activity.type = ActivityType.LISTENING;
    }

    let name: string = "";
    if (what_to_show === NonSpotifyShowOptions.Details && data.activity.details !== undefined) {
        name = data.activity.details;
    } else if (what_to_show === NonSpotifyShowOptions.State && data.activity.state !== undefined) {
        name = data.activity.state;
    } else if (what_to_show === NonSpotifyShowOptions.LargeImageText && data.activity.assets?.large_text !== undefined) {
        name = data.activity.assets.large_text;
    } else if (what_to_show === NonSpotifyShowOptions.State && data.activity.assets?.small_text !== undefined) {
        name = data.activity.assets.small_text;
    }

    const regex_output = new RegExp(regex_option).exec(name);
    if (regex_output === null || regex_output[1] === undefined) {
        // no match, use the full string
        data.activity.name = name;
    } else {
        data.activity.name = regex_output[1];
    }
}

var playbackStoppedTimeout: number | undefined;

export default definePlugin({
    name: "MusicTitleRPC",
    description: "Makes the song's title appear as the activity name when listening to music.",
    authors: [Devs.Blackilykat],
    start: () => {
        FluxDispatcher.subscribe("LOCAL_ACTIVITY_UPDATE", handleUpdate);
    },
    stop: () => {
        FluxDispatcher.unsubscribe("LOCAL_ACTIVITY_UPDATE", handleUpdate);
    },
    patches: [
        {
            find: "let{connectionId:",
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
        const {
            applicationId: application_id,
            spotifyActivityName: activity_name,
            spotifyActivityState: activity_state,
            spotifyActivityDetails: activity_details,
            spotifyActivityLargeImageText: activity_large_image_text,
            spotifyButtonOneText: activity_button_one_text,
            spotifyButtonTwoText: activity_button_two_text,
            spotifyButtonOneLink: activity_button_one_link,
            spotifyButtonTwoLink: activity_button_two_link
        } = settings.store;

        if (application_id === undefined) return;

        let large_image: string | undefined = undefined;
        if (e.track.album?.image?.url !== undefined) {
            large_image = (await ApplicationAssetUtils.fetchAssetIds(application_id, [e.track.album.image.url]))[0];
        }
        const activity: Activity = {
            application_id,
            name: formatSpotifyString(activity_name, e.track),
            type: ActivityType.LISTENING,
            flags: 0,
            details: formatSpotifyString(activity_details, e.track),
            state: formatSpotifyString(activity_state, e.track),
            timestamps: {
                start: Date.now(),
                end: (Date.now() + (e.track.duration ?? 0))
            },
            assets: {
                large_image,
                large_text: formatSpotifyString(activity_large_image_text, e.track)
            },
            buttons: [],
            metadata: {
                button_urls: []
            }
        };

        if (activity_button_one_text !== "") {
            activity.buttons![0] = formatSpotifyString(activity_button_one_text, e.track);
            activity.metadata!.button_urls![0] = formatSpotifyString(activity_button_one_link, e.track);
        }
        if (activity_button_two_text !== "") {
            activity.buttons![1] = formatSpotifyString(activity_button_two_text, e.track);
            activity.metadata!.button_urls![1] = formatSpotifyString(activity_button_two_link, e.track);
        }

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
                <br />
                <Forms.FormText variant="text-md/normal">
                    Text fields in settings for spotify users will have the following strings replaced:<br />
                    <code>{"{{Title}}"}</code>: The song's title<br />
                    <code>{"{{Album}}"}</code>: The song's album's name<br />
                    <code>{"{{FirstArtist}}"}</code>: The first artist's name<br />
                    <code>{"{{AllArtistsCommaSeparated}}"}</code>: Names of all artists, separated by commas (Artist1, Artist2, Artist3)<br />
                    <code>{"{{AllArtistsGrammarSeparated}}"}</code>: Names of all artists, separated according to english grammar (Artist1, Artist2 and Artist3)<br />
                    <code>{"{{Duration}}"}</code>: The song's duration (formatted mm:ss)<br />
                    <code>{"{{Id}}"}</code>: The track id<br />
                </Forms.FormText>
                <br />
                <Forms.FormTitle tag="h3">If you don't see the activity</Forms.FormTitle>
                <Forms.FormText variant="text-md/normal">
                    Make sure you enabled <code>Settings</code> &gt; <code>Activity privacy</code> &gt; <code>Share your detected activities with others</code>.
                </Forms.FormText>
            </React.Fragment>
        );
    },

});

function formatSpotifyString(input: string, song: SpotifyElement): string {
    if (input === undefined) return "";

    const durationMinutes: number = Math.trunc(song.duration! / 60000);
    const durationSeconds: number = Math.trunc(song.duration! / 1000) - durationMinutes * 60;
    return input
        .replace("{{Title}}", song.name)
        .replace("{{Album}}", song.album!.name)
        .replace("{{FirstArtist}}", song.artists![0].name)
        .replace("{{AllArtistsCommaSeparated}}", song.artists!.map(artist => artist.name).join(", "))
        .replace("{{AllArtistsGrammarSeparated}}", song.artists!
            .slice(0, song.artists!.length > 1 ? -1 : undefined)
            .map(artist => artist.name)
            .join(", ")
            + (song.artists!.length > 1 ? ` and ${song.artists![song.artists!.length - 1].name}` : ""))
        .replace("{{Duration}}", durationMinutes + ":" + ("00" + durationSeconds).slice(-2))
        .replace("{{Id}}", song.id);
}
