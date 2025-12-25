/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { ActivityFlags, ActivityType } from "@vencord/discord-types/enums";
import { findByPropsLazy } from "@webpack";
import { ApplicationAssetUtils, FluxDispatcher } from "@webpack/common";

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
    albums: string;
    artists: string;
    url: string;
    imageUrl?: string;
}

const enum NameFormat {
    StatusName = "status-name",
    ArtistFirst = "artist-first",
    SongFirst = "song-first",
    ArtistOnly = "artist",
    SongOnly = "song",
    albumsName = "albums"
}

interface Albums {
    id: number;
    image: string;
    name: string;
}

interface Artists {
    id: number;
    name: string;
    image: string;
}

interface ExternalIds {
    spotify: string[];
    appleMusic: string[];
}

interface Track {
    albums: Albums[];
    artists: Artists[];
    durationMs: number;
    explicit: boolean;
    externalIds: ExternalIds;
    id: number;
    name: string;
    spotifyPopularity: number;
    spotifyPreview: string;
    appleMusicPreview: string;
}

interface Item {
    date: string;
    isPlaying: boolean;
    progressMs: number;
    deviceName: string;
    track: Track;
    platform: string;
}

interface SFMR {
    item: Item;
}

const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame")!;

const applicationId = "1325126169179197500";
const placeholderId = "2a96cbd8b46e442fc41c2b86b821562f";

const logger = new Logger("StatsfmPresence");

const PresenceStore = findByPropsLazy("getLocalPresence");

let updateInterval: NodeJS.Timeout | undefined;

async function getApplicationAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(applicationId, [key]))[0];
}

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "StatsfmPresence",
    });
}

const settings = definePluginSettings({
    username: {
        description: "Stats.fm username",
        type: OptionType.STRING,
    },
    shareUsername: {
        description: "Show link to stats.fm profile",
        type: OptionType.BOOLEAN,
        default: false,
    },
    shareSong: {
        description: "Show link to song on stats.fm",
        type: OptionType.BOOLEAN,
        default: true,
    },
    hideWithSpotify: {
        description: "Hide stats.fm presence if spotify is running",
        type: OptionType.BOOLEAN,
        default: false,
    },
    hideWithExternalRPC: {
        description: "Hides stats.fm presence if an external RPC is running",
        type: OptionType.BOOLEAN,
        default: false,
    },
    statusName: {
        description: "Custom status text",
        type: OptionType.STRING,
        default: "Stats.fm",
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
            },
            {
                label: "Use albums name (falls back to custom status text if song has no albums)",
                value: NameFormat.albumsName
            }
        ],
    },
    useListeningStatus: {
        description: 'Show "Listening to" status instead of "Playing"',
        type: OptionType.BOOLEAN,
        default: true,
    },
    missingArt: {
        description: "When albums or albums art is missing",
        type: OptionType.SELECT,
        options: [
            {
                label: "Use large Stats.fm logo",
                value: "StatsFmLogo",
                default: true
            },
            {
                label: "Use generic placeholder",
                value: "placeholder"
            }
        ],
    },
    showStatsFmLogo: {
        description: "Show the Stats.fm next to the albums cover",
        type: OptionType.BOOLEAN,
        default: true,
    },
    alwaysHideArt: {
        description: "Disable downloading album art",
        type: OptionType.BOOLEAN,
        default: false,
    }
});

export default definePlugin({
    name: "StatsfmPresence",
    description: "Statsfm presence to track your music",
    authors: [EquicordDevs.Crxa],

    settingsAboutComponent: () => (
        <>
            <HeadingSecondary>How does this work?</HeadingSecondary>
            <Paragraph>
                Hey this is just here to explain how this works. By putting your stats.fm username in the settings, it will show what you're currently listening to on your discord profile. (this doesnt require an api but requires you to have your listening history public)
            </Paragraph>
        </>
    ),

    settings,

    start() {
        this.updatePresence();
        updateInterval = setInterval(() => { this.updatePresence(); }, 16000);
    },

    stop() {
        clearInterval(updateInterval);
        updateInterval = undefined;
    },

    async fetchTrackData(): Promise<TrackData | null> {
        if (!settings.store.username)
            return null;

        try {

            const res = await fetch(`https://api.stats.fm/api/v1/users/${settings.store.username}/streams/current`);
            if (!res.ok) throw `${res.status} ${res.statusText}`;

            const json = await res.json() as SFMR;
            if (!json.item) {
                logger.error("Error from Stats.fm API", json);
                return null;
            }

            const trackData = json.item.track;
            if (!trackData) return null;
            return {
                name: trackData.name || "Unknown",
                albums: trackData.albums.map(a => a.name).join(", ") ?? "Unknown",
                artists: trackData.artists[0].name ?? "Unknown",
                url: `https://stats.fm/track/${trackData.id}`, // https://stats.fm/track/665906 / https://twirl.cx/dj2gL.png reminder of what the id looks like to fetch track
                imageUrl: trackData.albums[0].image
            };
        } catch (e) {
            logger.error("Failed to query Stats.fm API", e);
            // will clear the rich presence if API fails
            return null;
        }
    },

    async updatePresence() {
        setActivity(await this.getActivity());
    },

    getLargeImage(track: TrackData): string | undefined {
        if (!settings.store.alwaysHideArt && track.imageUrl && !track.imageUrl.includes(placeholderId))
            return track.imageUrl;

        if (settings.store.missingArt === "placeholder")
            return "placeholder";
    },

    async getActivity(): Promise<Activity | null> {
        if (settings.store.hideWithExternalRPC) {
            if (PresenceStore.getActivities().some(a => a.application_id !== applicationId)) {
                return null;
            }
        }

        if (settings.store.hideWithSpotify) {
            if (PresenceStore.getActivities().some(a => a.type === ActivityType.LISTENING && a.application_id !== applicationId)) {
                // there is already music status because of Spotify or richerCider (probably more)
                return null;
            }
        }

        const trackData = await this.fetchTrackData();
        if (!trackData) return null;

        const largeImage = this.getLargeImage(trackData);
        const assets: ActivityAssets = largeImage ?
            {
                large_image: await getApplicationAsset(largeImage),
                large_text: trackData.albums || undefined,
                ...(settings.store.showStatsFmLogo && {
                    small_image: await getApplicationAsset("statsfm-large"),
                    small_text: "Stats.fm"
                }),
            } : {
                large_image: await getApplicationAsset("statsfm-large"),
                large_text: trackData.albums || undefined,
            };

        const buttons: ActivityButton[] = [];

        if (settings.store.shareUsername)
            buttons.push({
                label: "Stats.fm Profile",
                url: `https://stats.fm/${settings.store.username}`,
            });

        if (settings.store.shareSong)
            buttons.push({
                label: "View Song",
                url: trackData.url,
            });

        const statusName = (() => {
            switch (settings.store.nameFormat) {
                case NameFormat.ArtistFirst:
                    return trackData.artists + " - " + trackData.name;
                case NameFormat.SongFirst:
                    return trackData.name + " - " + trackData.artists;
                case NameFormat.ArtistOnly:
                    return trackData.artists;
                case NameFormat.SongOnly:
                    return trackData.name;
                case NameFormat.albumsName:
                    return trackData.albums || settings.store.statusName;
                default:
                    return settings.store.statusName;
            }
        })();

        return {
            application_id: applicationId,
            name: statusName,

            details: trackData.name,
            state: trackData.artists,
            assets,

            buttons: buttons.length ? buttons.map(v => v.label) : undefined,
            metadata: {
                button_urls: buttons.map(v => v.url),
            },

            type: settings.store.useListeningStatus ? ActivityType.LISTENING : ActivityType.PLAYING,
            flags: ActivityFlags.INSTANCE,
        };
    }
});
