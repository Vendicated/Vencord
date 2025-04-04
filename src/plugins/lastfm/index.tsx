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
import { getUserSettingLazy } from "@api/UserSettings";
import { Link } from "@components/Link";
import { Devs, EquicordDevs } from "@utils/constants";
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
    assets?: ActivityAssets; // LastFM
    assets2?: ActivityAssets; // StatsFM
    buttons?: Array<string>;
    name: string;
    application_id: string; // LastFM
    application_id2: string; // StatsFM
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
const enum ActivityType {
    PLAYING = 0,
    LISTENING = 2,
    STREAMING = 1, // Added Streaming ig as a alt to listening
}

const enum ActivityFlag {
    INSTANCE = 1 << 0,
}

const enum NameFormat { // (2) = Statsfm config
    StatusName = "status-name",
    ArtistFirst = "artist-first",
    SongFirst = "song-first",
    ArtistOnly = "artist",
    SongOnly = "song",
    AlbumName = "album",
    AlbumName2 = "album2", // ^
    ArtistOnly2 = "artist2", // ^
    ArtistFirst2 = "ArtistFirst2", // ^
    SongFirst2 = "SongFirst2", // ^
    SongOnly2 = "SongOnly2", // ^
}

interface Albums {
    id: number;
    name: string;
    image: string;
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

const applicationId = "1108588077900898414"; // LastFM Appid
const applicationId2 = "1325126169179197500"; // StatsFM Appid
const placeholderId = "2a96cbd8b46e442fc41c2b86b821562f";

const logger = new Logger("LastFMRichPresence + StatsfmFMRichPresence");

const PresenceStore = findByPropsLazy("getLocalPresence");

async function getApplicationAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(applicationId, [key]))[0];
}
async function getApplicationAsset2(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(applicationId2, [key]))[0];
}
function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "LastFM + Statsfm",
    });
}

const settings = definePluginSettings({
    username: {
        description: "last.fm username",
        type: OptionType.STRING,
    },
    statsfmusername: {
        description: "stats.fm username",
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
    shareUsernameStatsfm: {
        description: "show link to stats.fm profile",
        type: OptionType.BOOLEAN,
        default: false,
    },
    shareSong: {
        description: "show link to song on last.fm",
        type: OptionType.BOOLEAN,
        default: true,
    },
    StatsfmSong: {
        description: "show link to song on stats.fm",
        type: OptionType.BOOLEAN,
        default: true,
    },
    hideWithSpotify: {
        description: "hide last.fm presence if spotify is running",
        type: OptionType.BOOLEAN,
        default: true,
    },
    hidewithSpotifySFM: {
        description: "hide stats.fm presence if spotify is running",
        type: OptionType.BOOLEAN,
        default: true,
    },
    hideWithActivity: {
        description: "Hide Last.fm presence if you have any other presence",
        type: OptionType.BOOLEAN,
        default: false,
    },
    hideStatsfmWithExternalRPC: {
        description: "Hide Stats.fm presence if you have any other presence",
        type: OptionType.BOOLEAN,
        default: false,
    },
    enableGameActivity: {
        description: "Enable game activity for last.fm",
        type: OptionType.BOOLEAN,
        default: false,
    },
    enableGameActivitySFM: {
        description: "Enable game activity for stats.fm",
        type: OptionType.BOOLEAN,
        default: false,
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
            }
        ],
    },
    useListeningStatus: {
        description: 'show "Listening to" status instead of "Playing"',
        type: OptionType.BOOLEAN,
        default: false,
    },
    useStreamingStatus: {
        description: 'show "Streaming" status instead of "Playing"',
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
                label: "Use Large Stats.fm logo",
                value: "StatsFMLogo",
                default: false
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
    showStatsFMLogo: {
        description: "show the Stats.fm logo by the album cover",
        type: OptionType.BOOLEAN,
        default: false,
    },
    alwaysHideArt: {
        description: "Disable downloading album art",
        type: OptionType.BOOLEAN,
        default: false,
    }
});

export default definePlugin({
    name: "LastFMRichPresence",
    description: "Little plugin for Last.fm rich presence + Stats.fm rich presence",
    authors: [Devs.dzshn, Devs.RuiNtD, Devs.blahajZip, Devs.archeruwu, EquicordDevs.Crxa],

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

            <Forms.FormTitle tag="h3">How to get Stats.fm Presence!</Forms.FormTitle>
            <Forms.FormText>
                STATSFM ONLY:
                If you want to use stats.fm, you will need an account linked @ <Link href="https://stats.fm/login"></Link> and have your listening history public.
            </Forms.FormText>
        </>
    ),

    settings,

    start() {
        this.updatePresence();
        this.updateInterval = setInterval(() => { this.updatePresence(); }, 16000);
    },

    stop() {
        clearInterval(this.updateInterval);
    },
    // Last.fm Fetching
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
    // Stats.fm Fetching
    async fetchTrackDataStatsfm(): Promise<TrackData | null> {
        if (!settings.store.statsfmusername)
            return null;
        try {
            const res2 = await fetch(`https://api.stats.fm/api/v1/user/${settings.store.statsfmusername}/recent`);
            if (!res2.ok) throw `${res2.status} ${res2.statusText}`;

            const json = await res2.json() as SFMR;
            if (!json.item) {
                logger.error("Error from Stats.fm API"), json;
                return null;
            }
            const trackData2 = json.item.track;
            if (!trackData2) return null;
            return {
                name: trackData2.name || "Unknown",
                album: trackData2.albums.map(a => a.name).join(", ") || "Unknown",
                artist: trackData2.artists[0].name ?? "Unknown",
                url: `https://stats.fm/track/${trackData2.id}`,
                imageUrl: trackData2.albums[0].image
            };
        } catch (e) {
            logger.error("Failed to query Stats.fm API, Report to Equicord Discord. https://discord.gg/equicord", e);
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
        if (settings.store.hideWithActivity) {
            if (PresenceStore.getActivities().some(a => a.application_id !== applicationId && (!a.application_id2 || a.application_id2 !== applicationId2)))
                return null;
            {
            }
        }

        if (settings.store.hideWithSpotify) {
            if (PresenceStore.getActivities().some(a => (a.type === ActivityType.LISTENING || a.type === ActivityType.STREAMING) && a.application_id !== applicationId)) {
                // there is already music status because of Spotify or richerCider (probably more)
                return null;
            }
        }

        const trackData = await this.fetchTrackData();
        if (settings.store.enableGameActivity && trackData) {
            ShowCurrentGame.updateSetting(true);
        } else if (settings.store.enableGameActivity) {
            ShowCurrentGame.updateSetting(false);
        }
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
        // Stats.fm image stuff
        const largeImage2 = this.getLargeImage(trackData);
        const assets2: ActivityAssets = largeImage2 ?
            {
                large_image: await getApplicationAsset2(largeImage2),
                large_text: trackData.album || undefined,
                ...(settings.store.showStatsFMLogo && {
                    small_image: await getApplicationAsset2("statsfm-large"),
                    small_text: "Stats.fm"
                }),
            } : {
                large_image: await getApplicationAsset2("statsfm-large"),
                large_text: trackData.album || undefined,
            };
        const trackData2 = await this.fetchTrackDataStatsfm();
        const buttons: ActivityButton[] = [];

        if (settings.store.shareUsername)
            buttons.push({
                label: "Last.fm Profile",
                url: `https://www.last.fm/user/${settings.store.username}`,
            });
        // Stats.fm settings
        if (settings.store.shareUsernameStatsfm)
            buttons.push({
                label: "Stats.fm Profile",
                url: `https://stats.fm/user/${settings.store.statsfmusername}`,
            });
        if (settings.store.StatsfmSong)
            buttons.push({
                label: "View Song",
                url: trackData.url,
            });
        if (settings.store.shareSong)
            buttons.push({
                label: "View Song",
                url: trackData.url,
            });

        const statusName = (() => { // Last.FM satus stuff dont touch
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
                // Stats.fm Status stuff
                case NameFormat.ArtistFirst2: // hoping my code works
                    return trackData2?.artist ? `${trackData2.artist} - ${trackData2.name}` : settings.store.statusName;
                case NameFormat.SongFirst2:
                    return trackData2?.name ? `${trackData2.name} - ${trackData2.artist}` : settings.store.statusName;
                case NameFormat.ArtistOnly2:
                    return trackData2?.artist ?? settings.store.statusName;
                case NameFormat.SongOnly2:
                    return trackData2?.name ?? settings.store.statusName;
                case NameFormat.AlbumName2:
                    return trackData2?.album ?? settings.store.statusName;
                default:
                    return settings.store.statusName;
            }
        })();

        return {
            application_id: applicationId,
            application_id2: applicationId2, // StatsFM Appid
            name: statusName,

            details: trackData.name,
            state: trackData.artist,
            assets,
            assets2, // StatsFM assets

            buttons: buttons.length ? buttons.map(v => v.label) : undefined,
            metadata: {
                button_urls: buttons.map(v => v.url),
            },
            type: settings.store.useStreamingStatus ? ActivityType.STREAMING : settings.store.useListeningStatus ? ActivityType.LISTENING : ActivityType.PLAYING,
            flags: ActivityFlag.INSTANCE,
        };
    }
});
