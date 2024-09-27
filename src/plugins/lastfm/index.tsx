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
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ApplicationAssetUtils, FluxDispatcher, Forms } from "@webpack/common";

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
    timestamps?: {
        start: number;
        end: number;
    };
    client?: string;
}

// only relevant enum values
const enum ActivityType {
    PLAYING = 0,
    LISTENING = 2,
}

const enum ActivityFlag {
    INSTANCE = 1 << 0,
}

const enum NameFormat {
    StatusName = "status-name",
    ArtistFirst = "artist-first",
    SongFirst = "song-first",
    ArtistOnly = "artist",
    SongOnly = "song",
    AlbumName = "album",
    ClientName = "client"
}

const applicationId = "1108588077900898414";
const placeholderId = "2a96cbd8b46e442fc41c2b86b821562f";

const logger = new Logger("LastFMRichPresence");

const presenceStore = findByPropsLazy("getLocalPresence");

async function getApplicationAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(applicationId, [key]))[0];
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
    useListenBrainz: {
        description: "use listenbrainz instead of last.fm",
        type: OptionType.BOOLEAN,
        default: false,
    },
    listenBrainzUsername: {
        description: "listenbrainz username",
        type: OptionType.STRING,
    },
    shareUsername: {
        description: "show link to last.fm/listenbrainz profile",
        type: OptionType.BOOLEAN,
        default: false,
    },
    shareSong: {
        description: "show link to song on last.fm/listenbrainz",
        type: OptionType.BOOLEAN,
        default: true,
    },
    hideWithSpotify: {
        description: "hide last.fm/listenbrainz presence if spotify is running",
        type: OptionType.BOOLEAN,
        default: true,
    },
    statusName: {
        description: "custom status text",
        type: OptionType.STRING,
        default: "some music",
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
                label: "Use album name (falls back to custom status text if song has no album)",
                value: NameFormat.AlbumName
            },
            {
                label: "Use client name (either the streaming service or the music player, falls back to custom status text if song has no album)",
                value: NameFormat.ClientName
            }
        ],
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
    },
    showLastFmLogo: {
        description: "show the Last.fm logo by the album cover",
        type: OptionType.BOOLEAN,
        default: true,
    },
    sendTimestamps: {
        description: "show track duration / listening progress bar (currently only works on listenbrainz), keep in mind that these might not always be 100% accurate",
        type: OptionType.BOOLEAN,
        default: true,
    }
});

export default definePlugin({
    name: "LastFMRichPresence",
    description: "Little plugin for Last.fm and ListenBrainz rich presence",
    authors: [Devs.dzshn, Devs.RuiNtD, Devs.blahajZip, Devs.archeruwu, Devs.ConfiG],

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
        this.timestampStuff = {
            lastTrack: "",
            lastTrackChange: Date.now()
        };
        this.updatePresence();
        this.updateInterval = setInterval(() => { this.updatePresence(); }, 16000);
    },

    stop() {
        clearInterval(this.updateInterval);
        this.timestampStuff = undefined;
    },

    async fetchLastFM(): Promise<TrackData | null> {
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
            logger.error("Failed to query Last.fm API", e);
            // will clear the rich presence if API fails
            return null;
        }
    },

    async fetchListenBrainz(): Promise<TrackData | null> {
        if (!settings.store.listenBrainzUsername)
            return null;

        try {
            const res = await fetch(`https://api.listenbrainz.org/1/user/${settings.store.listenBrainzUsername}/playing-now`);
            if (!res.ok) throw `${res.status} ${res.statusText}`;

            const json = await res.json();
            if (json.error) {
                logger.error("Error from ListenBrainz API", `${json.error}: ${json.message}`);
                return null;
            }

            const trackData = json.payload?.listens?.[0];

            if (!trackData?.playing_now || !trackData.track_metadata)
                return null;

            const trackMeta = trackData.track_metadata;
            const trackAddInfo = trackMeta.additional_info;

            let recordingMbid = trackAddInfo?.recording_mbid;
            let releaseMbid = trackAddInfo?.release_mbid;

            if (!recordingMbid || !releaseMbid) {
                const metadata = await this.lookupListenBrainzMetadata(
                    trackMeta.artist_name,
                    trackMeta.track_name,
                    trackMeta.release_name
                );

                recordingMbid = recordingMbid || metadata.recording_mbid;
                releaseMbid = releaseMbid || metadata.release_mbid;
            }

            return {
                name: trackMeta.track_name || "Unknown",
                album: trackMeta.release_name || "Unknown",
                artist: trackMeta.artist_name || "Unknown",
                url: trackAddInfo?.origin_url || recordingMbid && `https://musicbrainz.org/recording/${recordingMbid}`,
                imageUrl: releaseMbid && `https://coverartarchive.org/release/${releaseMbid}/front`,
                timestamps: settings.store.sendTimestamps ? await this.getListenBrainzTimestamps(trackData) : undefined,
                client: trackAddInfo?.music_service_name || trackAddInfo?.music_service || trackAddInfo?.media_player
            };
        } catch (e) {
            logger.error("Failed to query ListenBrainz API", e);
            // will clear the rich presence if API fails
            return null;
        }
    },

    async lookupListenBrainzMetadata(artistName: string, recordingName: string, releaseName: string | undefined) {
        try {
            const params = new URLSearchParams({
                artist_name: artistName,
                recording_name: recordingName
            });
            if (releaseName)
                params.append("release_name", releaseName);

            const res = await fetch(`https://api.listenbrainz.org/1/metadata/lookup/?${params}`);
            if (!res.ok) throw `${res.status} ${res.statusText}`;

            const json = await res.json();
            if (json.error) {
                logger.error("Error from ListenBrainz API", `${json.error}: ${json.message}`);
                return {};
            }

            return json;
        } catch (e) {
            logger.error("Failed to query ListenBrainz API", e);
            return {};
        }
    },

    // attempt to get timestamps using some heuristics
    // pausing while listening and unpausing before the track would've ended will throw this off
    // but other than that it's pretty accurate, at least accurate enough :p
    async getListenBrainzTimestamps(trackData: any) {
        try {
            if (!trackData.track_metadata.additional_info?.duration && !trackData.track_metadata.additional_info?.duration_ms)
                return undefined;

            const now = Date.now();
            const duration = trackData.track_metadata.additional_info.duration_ms ||
                trackData.track_metadata.additional_info.duration * 1000;

            const trackMetadataJson = JSON.stringify(trackData.track_metadata);
            // track obviously changed
            if (trackMetadataJson !== this.timestampStuff.lastTrack) {
                this.timestampStuff.lastTrack = trackMetadataJson;
                this.timestampStuff.lastTrackChange = now;
            }
            // track probably changed because current time exceeded expected track end time
            else if (now > this.timestampStuff.lastTrackChange + duration) {
                this.timestampStuff.lastTrackChange = now;
            }

            const res = await fetch(`https://api.listenbrainz.org/1/user/${settings.store.listenBrainzUsername}/listens?count=1`);
            if (!res.ok) throw `${res.status} ${res.statusText}`;

            const json = await res.json();
            if (json.error) {
                logger.error("Error from ListenBrainz API", `${json.error}: ${json.message}`);
                return undefined;
            }

            const listenAddInfo = json.payload.count >= 1 && json.payload.listens[0].track_metadata.additional_info;
            if (listenAddInfo?.duration || listenAddInfo?.duration_ms) {
                const listenDuration = listenAddInfo.duration_ms || listenAddInfo.duration * 1000;
                const listenStart = json.payload.listens[0].listened_at * 1000;
                const listenEnd = listenStart + listenDuration;

                // this listen is current! we have accurate info!
                if (now <= listenEnd) {
                    return {
                        start: listenStart,
                        end: listenEnd
                    };
                }

                // it is Pretty Safe to assume we are listening to music sequentially without stopping Most Of The Time
                if (now <= listenEnd + duration) {
                    return {
                        start: listenEnd,
                        end: listenEnd + duration
                    };
                }
            }

            // this technically won't be accurate but good enough
            // until we get accurate info halfway through or 4 minutes into the track
            // or it's not the first track we are listening to in a row
            return {
                start: this.timestampStuff.lastTrackChange,
                end: this.timestampStuff.lastTrackChange + duration
            };
        } catch (e) {
            logger.error("Failed to query ListenBrainz API", e);
            return undefined;
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

        const trackData = settings.store.useListenBrainz ? await this.fetchListenBrainz() : await this.fetchLastFM();
        if (!trackData) return null;

        const largeImage = this.getLargeImage(trackData);
        const assets: ActivityAssets = largeImage ?
            {
                large_image: await getApplicationAsset(largeImage),
                large_text: trackData.album || undefined,
                ...(settings.store.showLastFmLogo && {
                    small_image: await getApplicationAsset("lastfm-small"),
                    small_text: "Last.fm"
                }),
            } : {
                large_image: await getApplicationAsset("lastfm-large"),
                large_text: trackData.album || undefined,
            };

        const buttons: ActivityButton[] = [];

        if (settings.store.shareUsername) {
            if (settings.store.useListenBrainz) {
                buttons.push({
                    label: "ListenBrainz Profile",
                    url: `https://listenbrainz.org/user/${settings.store.listenBrainzUsername}`,
                });
            }
            else {
                buttons.push({
                    label: "Last.fm Profile",
                    url: `https://www.last.fm/user/${settings.store.username}`,
                });
            }
        }

        if (settings.store.shareSong && trackData.url)
            buttons.push({
                label: "View Song",
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
                case NameFormat.ClientName:
                    return trackData.client || settings.store.statusName;
                default:
                    return settings.store.statusName;
            }
        })();

        return {
            application_id: applicationId,
            name: statusName,

            details: trackData.name,
            state: trackData.artist,
            assets,

            buttons: buttons.length ? buttons.map(v => v.label) : undefined,
            metadata: {
                button_urls: buttons.map(v => v.url),
            },

            timestamps: trackData.timestamps,

            type: settings.store.useListeningStatus ? ActivityType.LISTENING : ActivityType.PLAYING,
            flags: ActivityFlag.INSTANCE,
        };
    }
});
