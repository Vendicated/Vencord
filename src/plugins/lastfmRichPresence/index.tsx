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

import { definePluginSettings } from "@api/Settings";
import { LinkButton } from "@components/Button";
import { Card } from "@components/Card";
import { Heading } from "@components/Heading";
import { Margins } from "@components/margins";
import { Paragraph } from "@components/Paragraph";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Activity, ActivityAssets, ActivityButton } from "@vencord/discord-types";
import { ActivityFlags, ActivityStatusDisplayType, ActivityType } from "@vencord/discord-types/enums";
import { ApplicationAssetUtils, AuthenticationStore, FluxDispatcher, PresenceStore } from "@webpack/common";

interface TrackData {
    name: string;
    album: string;
    artist: string;
    url?: string;
    imageUrl?: string;
    serviceName?: string;
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

const enum ScrobblerBackends {
    LastFM = "lastfm",
    ListenBrainz = "listenbrainz"
}

// Last.fm API keys are essentially public information and have no access to your account, so including one here is fine.
const API_KEY = "790c37d90400163a5a5fe00d6ca32ef0";
const DISCORD_APP_ID = "1108588077900898414";
const LASTFM_PLACEHOLDER_IMAGE_HASH = "2a96cbd8b46e442fc41c2b86b821562f";

const logger = new Logger("LastFMRichPresence");

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
                "value": ScrobblerBackends.LastFM
            },
            {
                "label": "ListenBrainz",
                "value": ScrobblerBackends.ListenBrainz
            }
        ]
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
    fetchMetadata: {
        description: "Whether to fetch track metadata from MusicBrainz",
        type: OptionType.BOOLEAN,
        default: false,
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
                label: "Use music service name",
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

export default definePlugin({
    name: "AudioScrobblerRichPresence",
    description: "Little plugin for Rich Presence from AudioScrobblers. Currently supports Last.FM and ListenBrainz!",
    tags: ["Activity", "Media"],
    authors: [Devs.dzshn, Devs.RuiNtD, Devs.blahajZip, Devs.archeruwu],

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

    async fetchListenBrainzData() {
        try {
            const res = await fetch(`https://api.listenbrainz.org/1/user/${settings.store.username}/playing-now`);
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

            const data = await res.json().then(json => json.payload?.listens[0]);
            if (!data.playing_now)
                return null;

            return {
                name: data.track_metadata.track_name || "Unknown",
                artist: data.track_metadata.artist_name,
                album: data.track_metadata.release_name || "Unknown",
                serviceName: data?.track_metadata.additional_info.music_service_name
            } as TrackData;
        } catch (e) {
            logger.error("Failed to query ListenBrainz API", e);
        }
    },

    async fetchLastFMData() {
        try {
            const params = new URLSearchParams({
                method: "user.getrecenttracks",
                api_key: settings.store.apiKey || API_KEY,
                user: settings.store.username!,
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

            if (!trackData?.["@attr"]?.nowplaying)
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
            logger.error("Failed to query Last.FM API", e);
            // will clear the rich presence if API fails
            return null;
        }
    },

    async fetchMetadata(data: TrackData) {
        // this needs to be encoded separately—URLSearchParams encodes spaces as "+"
        const query = encodeURIComponent(`artist:"${data.artist}" AND recording:"${data.name}"`);

        const params = new URLSearchParams({
            fmt: "json",
            limit: "1"
        });

        const metadataLookup = await fetch("https://musicbrainz.org/ws/2/recording/?" + params + "&query=" + query, {
            headers: { "User-Agent": VENCORD_USER_AGENT }
        }).then(res => {
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            return res.json();
        }).then(json => json.recordings[0]);

        if (!metadataLookup) {
            return null;
        }

        // build the artist string...
        let artist = "";
        metadataLookup["artist-credit"].forEach((artistCredit: { name: string; joinphrase: string; }) => {
            artist += artistCredit.name;
            if (artistCredit.joinphrase !== undefined) artist += artistCredit.joinphrase;
        });

        // preemptively set this to the first release found
        let album = metadataLookup.releases[0]["release-group"].title;
        let releaseGroupMBID = metadataLookup.releases[0]["release-group"].id;

        // then look for something matching what the scrobbler gave us
        metadataLookup.releases.forEach((release: { title: string, id: string; }) => {
            // TODO: fuzzy match?
            if (data.album === release.title) {
                album = release["release-group"].title;
                releaseGroupMBID = release["release-group"].id;
            }
        });

        const coverArtURL = await this.fetchCoverArt(releaseGroupMBID);

        // I guess bro
        let url;
        if (settings.store.scrobblerBackend === ScrobblerBackends.ListenBrainz) {
            url = `https://listenbrainz.org/track/${metadataLookup.id}/`;
        }

        return {
            name: metadataLookup.title,
            artist,
            album,
            url: url,
            imageUrl: coverArtURL
        } as TrackData;
    },

    async fetchCoverArt(releaseGroupMBID: string) {
        const res = await fetch(`https://coverartarchive.org/release-group/${releaseGroupMBID}`);
        if (!res.ok) return null;
        return res.json().then(json => json.images[0].thumbnails.large);
    },

    async fetchTrackData(): Promise<TrackData | null> {
        if (!settings.store.username)
            return null;

        let trackData;

        switch (settings.store.scrobblerBackend) {
            case ScrobblerBackends.LastFM:
                trackData = await this.fetchLastFMData();
                break;
            case ScrobblerBackends.ListenBrainz:
                trackData = await this.fetchListenBrainzData();
                break;
        }

        if (settings.store.fetchMetadata) {
            trackData = Object.assign(trackData, await this.fetchMetadata(trackData));
        }
        return trackData;
    },

    async updatePresence() {
        setActivity(await this.getActivity());
    },

    getLargeImage(track: TrackData): string | undefined {
        if (settings.store.showAlbumCover && track.imageUrl && !track.imageUrl.includes(LASTFM_PLACEHOLDER_IMAGE_HASH))
            return track.imageUrl;

        if (settings.store.missingArt === "placeholder")
            return "placeholder";
    },

    async getActivity(): Promise<Activity | null> {
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

        const trackData = await this.fetchTrackData();
        if (!trackData) return null;

        const largeImage = this.getLargeImage(trackData);
        const assets: ActivityAssets = largeImage ?
            {
                large_image: await getApplicationAsset(largeImage),
                large_text: trackData.album || undefined,
                ...(settings.store.showLogo && {
                    small_image: await getApplicationAsset("lastfm-small"),
                    small_text: "Last.fm"
                }),
            } : {
                large_image: await getApplicationAsset("lastfm-large"),
                large_text: trackData.album || undefined,
            };

        const buttons: ActivityButton[] = [];

        if (settings.store.shareUsername)
            buttons.push({
                label: "Last.fm Profile",
                url: `https://www.last.fm/user/${settings.store.username}`,
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
            activity.details_url = trackData.url;
            activity.state_url = `https://www.last.fm/music/${encodeURIComponent(trackData.artist)}`;

            if (trackData.album) {
                activity.assets!.large_url = `https://www.last.fm/music/${encodeURIComponent(trackData.artist)}/${encodeURIComponent(trackData.album)}`;
            }
        }

        return activity;
    }
});
