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

import { definePluginSettings, migratePluginSetting, migratePluginSettings } from "@api/Settings";
import { LinkButton } from "@components/Button";
import { Card } from "@components/Card";
import { Heading } from "@components/Heading";
import { Margins } from "@components/margins";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Activity, ActivityAssets, ActivityButton } from "@vencord/discord-types";
import { ActivityFlags, ActivityStatusDisplayType, ActivityType } from "@vencord/discord-types/enums";
import { ApplicationAssetUtils, AuthenticationStore, FluxDispatcher, PresenceStore } from "@webpack/common";

import { LastFMScrobbler } from "./lastfm";
import { ListenBrainzScrobbler } from "./listenbrainz";

export interface TrackData {
    name: string;
    album: string;
    artist: string;
    trackURL?: string;
    artistURL?: string;
    albumURL?: string;
    imageURL?: string;
    serviceName?: string;
}

export interface ScrobblerBackend {
    name: string,
    id: string,

    fetchTrackData(username: string, apiKey?: string): Promise<TrackData | null>;
    getUserURL(username: string): string;
}

const enum NameFormat {
    StatusName = "status-name",
    ArtistFirst = "artist-first",
    SongFirst = "song-first",
    ArtistOnly = "artist",
    SongOnly = "song",
    AlbumName = "album",
    ServiceName = "service-name"
}

// Last.fm API keys are essentially public information and have no access to your account, so including one here is fine.
const LASTFM_API_KEY = "790c37d90400163a5a5fe00d6ca32ef0";
const DISCORD_APP_ID = "1108588077900898414";
const LASTFM_PLACEHOLDER_IMAGE_HASH = "2a96cbd8b46e442fc41c2b86b821562f";

async function getApplicationAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(DISCORD_APP_ID, [key]))[0];
}

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "LastFM",
    });
}

const settings = definePluginSettings({
    scrobblerBackend: {
        description: "The scrobbler backend to use.",
        type: OptionType.SELECT,
        options: [
            {
                "label": "Last.FM",
                "value": "lastfm",
                "default": true
            },
            {
                "label": "ListenBrainz",
                "value": "listenbrainz"
            }
        ] as const
    },
    apiKey: {
        displayName: "API Key",
        description: "Custom Last.fm API key. Not required but highly recommended to avoid rate limiting with our shared key",
        type: OptionType.STRING,
    },
    username: {
        description: "Username",
        type: OptionType.STRING,
    },
    shareUsername: {
        description: "Show link to scrobbler profile",
        type: OptionType.BOOLEAN,
        default: false,
    },
    clickableLinks: {
        description: "Make track, artist and album names clickable links",
        type: OptionType.BOOLEAN,
        default: true,
    },
    hideWithSpotify: {
        description: "Hide presence if Spotify is running",
        type: OptionType.BOOLEAN,
        default: true,
    },
    hideWithActivity: {
        description: "Hide presence if you have any other presence",
        type: OptionType.BOOLEAN,
        default: false,
    },
    statusName: {
        description: "Custom status text. You can use the following variables: {artist} | {album} | {title}",
        type: OptionType.STRING,
        default: "some music",
    },
    statusDisplayType: {
        description: "Show the track / artist name in the member list",
        type: OptionType.SELECT,
        options: [
            {
                label: "Don't show (shows generic listening message)",
                value: "off"
            },
            {
                label: "Show artist name",
                value: "artist",
                default: true
            },
            {
                label: "Show track name",
                value: "track"
            }
        ]
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
                label: "Use music service name (falls back to custom status text)",
                value: NameFormat.ServiceName
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
                label: "Use album name (falls back to custom status text if song has no album)",
                value: NameFormat.AlbumName
            }
        ],
    },
    useListeningStatus: {
        description: 'Show "Listening to" status instead of "Playing"',
        type: OptionType.BOOLEAN,
        default: false,
    },
    missingArt: {
        description: "When album or album art is missing",
        type: OptionType.SELECT,
        options: [
            {
                label: "Use large scrobbler logo",
                value: "logo",
                default: true
            },
            {
                label: "Use generic placeholder",
                value: "placeholder"
            }
        ],
    },
    showLogo: {
        displayName: "Show Scrobbler Logo",
        description: "Show the scrobbler service logo by the album cover",
        type: OptionType.BOOLEAN,
        default: true,
    },
    showAlbumCover: {
        description: "Show album cover. Disabling this will display a placeholder. Useful if your music has inappropriate art",
        type: OptionType.BOOLEAN,
        default: true,
    }
});

migratePluginSettings("MusicRichPresence", "LastFMRichPresence");
migratePluginSetting("MusicRichPresence", "showLastFmLogo", "showLogo");
export default definePlugin({
    name: "MusicRichPresence",
    description: "Rich Presence for Last.FM/Listenbrainz",
    tags: ["Activity", "Media"],
    searchTerms: ["lastfm", "LastFMRichPresence"],
    authors: [Devs.Rini, Devs.Ven, Devs.angelcube, Devs.RuiNtD, Devs.blahajZip, Devs.archeruwu],

    settings,

    settingsAboutComponent() {
        return (
            <Card>
                <Heading tag="h2">Last.FM</Heading>
                <Heading tag="h5">How to create an API key</Heading>
                <Paragraph>Set <strong>Application name</strong> and <strong>Application description</strong> to anything and leave the rest blank.</Paragraph>
                <LinkButton size="small" href="https://www.last.fm/api/account/create" className={Margins.top8}>Create API Key</LinkButton>
            </Card>
        );
    },

    start() {
        this.updatePresence();
        this.updateInterval = setInterval(() => { this.updatePresence(); }, 16000);
    },

    stop() {
        clearInterval(this.updateInterval);
    },

    async updatePresence() {
        setActivity(await this.getActivity());
    },

    getLargeImage(track: TrackData): string | undefined {
        if (settings.store.showAlbumCover && track.imageURL && !track.imageURL.includes(LASTFM_PLACEHOLDER_IMAGE_HASH))
            return track.imageURL;

        if (settings.store.missingArt === "placeholder")
            return "placeholder";
    },

    async getActivity(): Promise<Activity | null> {
        if (!settings.store.username)
            return null;

        if (settings.store.hideWithActivity) {
            if (PresenceStore.getActivities(AuthenticationStore.getId()).some(a => a.application_id !== DISCORD_APP_ID && a.type !== ActivityType.CUSTOM_STATUS)) {
                return null;
            }
        }

        if (settings.store.hideWithSpotify) {
            if (PresenceStore.getActivities(AuthenticationStore.getId()).some(a => a.type === ActivityType.LISTENING && a.application_id !== DISCORD_APP_ID)) {
                // there is already music status because of Spotify or richerCider (probably more)
                return null;
            }
        }

        const scrobbler = settings.store.scrobblerBackend === "lastfm" ? LastFMScrobbler : ListenBrainzScrobbler;

        const trackData = await scrobbler.fetchTrackData(settings.store.username, settings.store.apiKey || LASTFM_API_KEY);
        if (!trackData) return null;

        const largeImage = this.getLargeImage(trackData);
        const assets: ActivityAssets = largeImage ?
            {
                large_image: await getApplicationAsset(largeImage),
                large_text: trackData.album || undefined,
                ...(settings.store.showLogo && {
                    small_image: await getApplicationAsset(`${scrobbler.id}-small`),
                    small_text: scrobbler.id
                }),
            } : {
                large_image: await getApplicationAsset(`${scrobbler.id}-large`),
                large_text: trackData.album || undefined,
            };

        const buttons: ActivityButton[] = [];

        if (settings.store.shareUsername) {
            buttons.push({
                label: `${scrobbler.name} Profile`,
                url: scrobbler.getUserURL(settings.store.username!)
            });
        }

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
                    return trackData.album || settings.store.statusName
                        .replaceAll("{artist}", trackData.artist || "")
                        .replaceAll("{album}", trackData.album || "")
                        .replaceAll("{title}", trackData.name || "");
                case NameFormat.ServiceName:
                    return trackData.serviceName || settings.store.statusName
                        .replaceAll("{artist}", trackData.artist || "")
                        .replaceAll("{album}", trackData.album || "")
                        .replaceAll("{title}", trackData.name || "");
                default:
                    return settings.store.statusName
                        .replaceAll("{artist}", trackData.artist || "")
                        .replaceAll("{album}", trackData.album || "")
                        .replaceAll("{title}", trackData.name || "");
            }
        })();

        const activity: Activity = {
            application_id: DISCORD_APP_ID,
            name: statusName,

            details: trackData.name,
            state: trackData.artist,
            status_display_type: {
                "off": ActivityStatusDisplayType.NAME,
                "artist": ActivityStatusDisplayType.STATE,
                "track": ActivityStatusDisplayType.DETAILS
            }[settings.store.statusDisplayType],

            assets,

            buttons: buttons.length ? buttons.map(v => v.label) : undefined,
            metadata: {
                button_urls: buttons.map(v => v.url),
            },

            type: settings.store.useListeningStatus ? ActivityType.LISTENING : ActivityType.PLAYING,
            flags: ActivityFlags.INSTANCE,
        };

        if (settings.store.clickableLinks) {
            activity.details_url = trackData.trackURL;
            activity.state_url = trackData.artistURL;

            if (trackData.album) {
                activity.assets!.large_url = trackData.albumURL;
            }
        }

        return activity;
    }
});
