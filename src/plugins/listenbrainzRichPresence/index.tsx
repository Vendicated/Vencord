/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { LinkButton } from "@components/Button";
import { Card } from "@components/Card";
import { Heading } from "@components/Heading";
import { Margins } from "@components/margins";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Activity, ActivityAssets, ActivityButton } from "@vencord/discord-types";
import { ActivityFlags, ActivityStatusDisplayType, ActivityType } from "@vencord/discord-types/enums";
import { ApplicationAssetUtils, AuthenticationStore, FluxDispatcher, PresenceStore } from "@webpack/common";

interface TrackData {
    recordingMBID: string;
    artistMBID: string;
    releaseGroupMBID: string;
    name: string;
    album: string;
    artist: string;
    coverArtURL?: string;
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

const DISCORD_APP_ID = "1486179630825082981";

const logger = new Logger("ListenBrainzRichPresence");

async function getApplicationAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(DISCORD_APP_ID, [key]))[0];
}

function setActivity(activity: Activity | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "ListenBrainz",
    });
}

const settings = definePluginSettings({
    apiKey: {
        description: "Your ListenBrainz token. Required to retrieve metadata because ListenBrainz wants to prevent bot scraping.",
        type: OptionType.STRING
    },
    username: {
        description: "ListenBrainz username",
        type: OptionType.STRING,
    },
    shareUsername: {
        description: "Show link to ListenBrainz profile",
        type: OptionType.BOOLEAN,
        default: false,
    },
    clickableLinks: {
        description: "Make track, artist and album names clickable links",
        type: OptionType.BOOLEAN,
        default: true,
    },
    hideWithSpotify: {
        description: "Hide ListenBrainz presence if Spotify is running",
        type: OptionType.BOOLEAN,
        default: true,
    },
    hideWithActivity: {
        description: "Hide ListenBrainz presence if you have any other presence",
        type: OptionType.BOOLEAN,
        default: false,
    },
    statusName: {
        description: "Custom status text",
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
                label: "Use large ListenBrainz logo",
                value: "listenbrainzLogo",
                default: true
            },
            {
                label: "Use generic placeholder",
                value: "placeholder"
            }
        ],
    },
    showListenbrainzLogo: {
        description: "Show the ListenBrainz logo by the album cover",
        type: OptionType.BOOLEAN,
        default: true,
    },
});

export default definePlugin({
    name: "ListenBrainzRichPresence",
    description: "Little plugin for ListenBrainz rich presence.",
    authors: [Devs.angelcube, Devs.dzshn, Devs.RuiNtD, Devs.blahajZip, Devs.archeruwu],

    settings,

    settingsAboutComponent() {
        return (
            <Card>
                <Heading tag="h5">How to retrieve your user token</Heading>
                <Paragraph>Scroll down to <strong>User token</strong> and click <strong>Copy</strong>.</Paragraph>
                <LinkButton size="small" href="https://listenbrainz.org/settings/" className={Margins.top8}>Retrieve token</LinkButton>
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

    async fetchTrackData(): Promise<TrackData | null> {
        if (!settings.store.username || !settings.store.apiKey)
            return null;

        try {
            const lbres = await fetch(`https://api.listenbrainz.org/1/user/${settings.store.username}/playing-now`);
            if (!lbres.ok) throw `${lbres.status} ${lbres.statusText}`;

            const lbjson = await lbres.json();
            if (lbjson.error) {
                logger.error("Error from ListenBrainz API", `${lbjson.error}: ${lbjson.message}`);
                return null;
            }

            const rawTrackData = lbjson.payload?.listens[0];
            if (!rawTrackData?.playing_now)
                return null;


            const metadataParams = new URLSearchParams({
                recording_name: rawTrackData.track_metadata.track_name,
                artist_name: rawTrackData.track_metadata.artist_name,
                metadata: "true",
                inc: "artist tag release"
            });
            const metadataLookup = await fetch(`https://api.listenbrainz.org/1/metadata/lookup/?${metadataParams}`, {
                headers: {
                    "Authorization": `Token ${settings.store.apiKey}`
                }
            });

            const metadataJSON = await metadataLookup.json();
            const trackData = metadataJSON?.metadata;

            let releaseGroupMBID;
            let artistMBID;
            let recordingMBID;

            if (Object.keys(metadataJSON).length !== 0) {
                releaseGroupMBID = trackData?.release.release_group_mbid;
                artistMBID = metadataJSON?.artist_mbids[0]; // uses the first artist credited. or maybe alphabetical? not sure
                recordingMBID = metadataJSON?.recording_mbid;
            }

            const name = trackData?.recording.name || rawTrackData.track_metadata.track_name;
            const artist = trackData?.artist.name || rawTrackData.track_metadata.artist_name;
            const album = trackData?.release.name || rawTrackData.track_metadata.release_name;
            const serviceName = rawTrackData?.track_metadata.additional_info.music_service_name;

            let coverArtURL;

            if (releaseGroupMBID) {
                const coverartres = await fetch(`https://coverartarchive.org/release-group/${releaseGroupMBID}`);
                if (coverartres.status !== 404) {
                    const coverartjson = await coverartres.json();
                    coverArtURL = coverartjson?.images[0].thumbnails.large;
                }
            } else if (metadataJSON.release_mbid) {
                // sometimes there's a release, but no release group... for some reason, so we fall back to this
                const coverartres = await fetch(`https://coverartarchive.org/release/${metadataJSON.release_mbid}`);
                if (coverartres.status !== 404) {
                    const coverartjson = await coverartres.json();
                    coverArtURL = coverartjson?.images[0].thumbnails.large;
                }
            }

            return {
                recordingMBID,
                artistMBID,
                releaseGroupMBID,
                name: name || "Unknown",
                album,
                artist: artist || "Unknown",
                coverArtURL,
                serviceName
            };
        } catch (e) {
            logger.error("Failed to query ListenBrainz API", e);
            // will clear the rich presence if API fails
            return null;
        }
    },

    async updatePresence() {
        setActivity(await this.getActivity());
    },

    getLargeImage(track: TrackData): string | undefined {
        if (track.coverArtURL)
            return track.coverArtURL;

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
                ...(settings.store.showListenbrainzLogo && {
                    small_image: await getApplicationAsset("listenbrainz-small"),
                    small_text: "ListenBrainz"
                }),
            } : {
                large_image: await getApplicationAsset("listenbrainz-large"),
                large_text: trackData.album || undefined,
            };

        const buttons: ActivityButton[] = [];

        if (settings.store.shareUsername)
            buttons.push({
                label: "ListenBrainz Profile",
                url: `https://listenbrainz.org/user/${settings.store.username}`,
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
                case NameFormat.ServiceName:
                    return trackData.serviceName || settings.store.statusName;
                default:
                    return settings.store.statusName;
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
            activity.details_url ? trackData.recordingMBID : `https://listenbrainz.org/track/${encodeURIComponent(trackData.recordingMBID)}`;
            activity.state_url ? trackData.artistMBID : `https://listenbrainz.org/artist/${encodeURIComponent(trackData.artistMBID)}`;

            if (trackData.album) {
                activity.assets!.large_url = `https://listenbrainz.org/album/${encodeURIComponent(trackData.releaseGroupMBID)}`;
            }
        }

        return activity;
    }
});
