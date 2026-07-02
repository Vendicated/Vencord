/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { ActivityFlags, ActivityStatusDisplayType, ActivityType } from "@vencord/discord-types/enums";
import { ApplicationAssetUtils } from "@webpack/common";

import type * as NativeModule from "./native";

type TrackData = NativeModule.TrackData;

const logger = new Logger("ApsenzAppleMusic");

const APSENZ_CLIENT_ID = "1521622295964287118";

const enum LinkMode {
    Song = "song",
    Album = "album"
}

const enum ExtraAlbumLineMode {
    Off = "off",
    Album = "album"
}

const enum StatusDisplayMode {
    Artist = "artist",
    Song = "song",
    App = "app"
}

const enum PresenceType {
    Listening = "listening",
    Playing = "playing"
}

function getNative(): PluginNative<typeof import("./native")> | undefined {
    const helpers = VencordNative.pluginHelpers as Record<string, any>;

    return (helpers.ApsenzAppleMusic ?? helpers.apsenzAppleMusic) as PluginNative<typeof import("./native")> | undefined;
}

const settings = definePluginSettings({
    country: {
        displayName: "Country",
        type: OptionType.STRING,
        description: "Apple/iTunes country code, for example de, us, gb",
        default: "de"
    },
    presenceType: {
        displayName: "Presence Type",
        type: OptionType.SELECT,
        description: "How Discord labels the activity",
        options: [
            { label: "Listening to Apple Music", value: PresenceType.Listening, default: true },
            { label: "Playing Apple Music", value: PresenceType.Playing }
        ]
    },
    refreshInterval: {
        displayName: "Refresh Interval",
        type: OptionType.SLIDER,
        description: "Refresh interval in seconds",
        markers: [1, 2, 3, 5, 10],
        default: 3,
        restartNeeded: true
    },
    showWhilePaused: {
        displayName: "Show While Paused",
        type: OptionType.BOOLEAN,
        description: "Keep the presence visible when Apple Music is paused",
        default: true
    },
    showArtwork: {
        displayName: "Show Artwork",
        type: OptionType.BOOLEAN,
        description: "Show Apple Music album artwork when found",
        default: true
    },
    showSmallIcon: {
        displayName: "Show Small Icon",
        type: OptionType.BOOLEAN,
        description: "Show small Apple Music icon if your Discord app has an asset named applemusic",
        default: false
    },
    showButton: {
        displayName: "Show Button",
        type: OptionType.BOOLEAN,
        description: "Show Play on Apple Music button when a link is found",
        default: false
    },
    clickableSongTitle: {
        displayName: "Clickable Song Title",
        type: OptionType.BOOLEAN,
        description: "Clicking the song title opens the Apple Music song page",
        default: true
    },
    clickableArtistName: {
        displayName: "Clickable Artist Name",
        type: OptionType.BOOLEAN,
        description: "Clicking the artist name opens Apple Music artist/search page",
        default: true
    },
    clickableCoverImage: {
        displayName: "Clickable Cover Image",
        type: OptionType.BOOLEAN,
        description: "Clicking the cover image opens Song or Album",
        default: true
    },
    coverImageOpens: {
        displayName: "Cover Image Opens",
        type: OptionType.SELECT,
        description: "What the cover image opens",
        options: [
            { label: "Song", value: LinkMode.Song, default: true },
            { label: "Album", value: LinkMode.Album }
        ]
    },
    extraAlbumLine: {
        displayName: "Extra Album Line",
        type: OptionType.SELECT,
        description: "Extra tooltip line on the cover image",
        options: [
            { label: "Off", value: ExtraAlbumLineMode.Off, default: true },
            { label: "Album", value: ExtraAlbumLineMode.Album }
        ]
    },
    statusDisplay: {
        displayName: "Member List Status",
        type: OptionType.SELECT,
        description: "What Discord tries to show in member-list status",
        options: [
            { label: "Artist", value: StatusDisplayMode.Artist, default: true },
            { label: "Song", value: StatusDisplayMode.Song },
            { label: "Apple Music", value: StatusDisplayMode.App }
        ]
    },
    debugLogs: {
        displayName: "Debug Logs",
        type: OptionType.BOOLEAN,
        description: "Write logs to %APPDATA%\\ApsenzAppleMusic\\native.log",
        default: false
    }
});

function clean(value?: string, max = 128) {
    if (!value) return undefined;

    const cleaned = value.replace(/\s+/g, " ").trim();

    return cleaned ? cleaned.slice(0, max) : undefined;
}

function formatTime(seconds?: number) {
    const total = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    return h > 0
        ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
        : `${m}:${s.toString().padStart(2, "0")}`;
}

function getStatusDisplayType() {
    switch (settings.store.statusDisplay) {
        case StatusDisplayMode.Song:
            return ActivityStatusDisplayType.DETAILS;
        case StatusDisplayMode.App:
            return ActivityStatusDisplayType.NAME;
        case StatusDisplayMode.Artist:
        default:
            return ActivityStatusDisplayType.STATE;
    }
}

async function getAssetId(source?: string) {
    if (!source)
        return undefined;

    try {
        return (await ApplicationAssetUtils.fetchAssetIds(APSENZ_CLIENT_ID, [source]))?.[0];
    } catch (error) {
        if (settings.store.debugLogs)
            logger.warn("Failed to fetch asset id", source, error);

        return undefined;
    }
}

function fallbackSongUrl(track: TrackData) {
    const country = settings.store.country || "de";
    const q = encodeURIComponent(`${track.name} ${track.artist ?? ""}`);

    return `https://music.apple.com/${country}/search?term=${q}`;
}

function fallbackArtistUrl(track: TrackData) {
    const country = settings.store.country || "de";
    const q = encodeURIComponent(track.artist || track.name);

    return `https://music.apple.com/${country}/search?term=${q}`;
}

async function buildActivity(track: TrackData) {
    if (!track.isPlaying && !settings.store.showWhilePaused)
        return null;

    const songUrl = track.appleMusicLink || fallbackSongUrl(track);
    const artistUrl = track.appleMusicArtistLink || fallbackArtistUrl(track);
    const albumUrl = track.albumLink || songUrl;

    let state = clean(track.artist) || "Unknown Artist";

    if (!track.isPlaying && track.duration)
        state = `${state} - paused ${formatTime(track.playerPosition)} / ${formatTime(track.duration)}`;

    const activity: any = {
        application_id: APSENZ_CLIENT_ID,
        type: settings.store.presenceType === PresenceType.Playing ? ActivityType.PLAYING : ActivityType.LISTENING,
        name: "Apple Music",
        details: clean(track.name) || "Unknown Song",
        state,
        flags: ActivityFlags.INSTANCE,
        status_display_type: getStatusDisplayType()
    };

    if (settings.store.clickableSongTitle)
        activity.details_url = songUrl;

    if (settings.store.clickableArtistName)
        activity.state_url = artistUrl;

    if (track.isPlaying && track.playerPosition != null && track.duration) {
        const now = Math.floor(Date.now() / 1000);
        const position = Math.max(0, Math.floor(track.playerPosition));
        const duration = Math.max(0, Math.floor(track.duration));

        activity.timestamps = {
            start: now - position,
            end: now - position + duration
        };
    }

    const assets: any = {};

    if (settings.store.showArtwork && track.albumArtwork) {
        // Direct Discord RPC accepts application asset keys reliably.
        // For dynamic album art, using the raw HTTPS artwork URL works better here than Vencord's mp:external id,
        // because raw IPC was showing the app icon when mp:external was used.
        assets.large_image = track.albumArtwork;

        // Do not set large_text when Extra Album Line is Off.
        // Discord shows large_text as that annoying third line under the artist on this profile card.
        if (settings.store.extraAlbumLine === ExtraAlbumLineMode.Album && track.album)
            assets.large_text = clean(track.album);

        if (settings.store.clickableCoverImage)
            assets.large_url = settings.store.coverImageOpens === LinkMode.Album ? albumUrl : songUrl;
    }

    if (settings.store.showSmallIcon) {
        const smallIcon = await getAssetId("applemusic");

        if (smallIcon) {
            assets.small_image = smallIcon;
            assets.small_text = "Apple Music";
        }
    }

    if (Object.keys(assets).length)
        activity.assets = assets;

    if (settings.store.showButton && songUrl) {
        activity.buttons = [
            {
                label: "Play on Apple Music",
                url: songUrl
            }
        ];
    }

    return activity;
}

export default definePlugin({
    name: "ApsenzAppleMusic",
    description: "Apple Music Rich Presence for Discord on Windows",
    tags: ["Activity", "Media"],
    authors: [{ name: "Apsenz", id: 550601529283969044n }],
    settings,

    start() {
        this.updatePresence();
        this.interval = setInterval(() => this.updatePresence(), Math.max(1, settings.store.refreshInterval) * 1000);
    },

    async stop() {
        clearInterval(this.interval);

        try {
            await getNative()?.clearActivity?.(APSENZ_CLIENT_ID);
            await getNative()?.stop?.();
        } catch (error) {
            logger.error("Failed to stop ApsenzAppleMusic", error);
        }
    },

    async updatePresence() {
        // Metadata lookup can take longer than the refresh interval for hard-to-find songs.
        // Without this lock, two updates race each other, reconnect IPC repeatedly, and sometimes the presence vanishes.
        if (this.isUpdating)
            return;

        this.isUpdating = true;

        try {
            const Native = getNative();

            if (!Native?.getTrackData || !Native?.setActivity) {
                logger.error("Native helper missing. Available helpers:", Object.keys(VencordNative.pluginHelpers ?? {}));
                return;
            }

            const track = await Native.getTrackData(settings.store.country, settings.store.debugLogs);

            if (!track) {
                await Native.clearActivity(APSENZ_CLIENT_ID);
                return;
            }

            if (settings.store.debugLogs)
                logger.info("Track", track);

            const activity = await buildActivity(track);

            if (!activity) {
                await Native.clearActivity(APSENZ_CLIENT_ID);
                return;
            }

            if (settings.store.debugLogs)
                logger.info("Activity", activity);

            await Native.setActivity(APSENZ_CLIENT_ID, activity);
        } catch (error) {
            logger.error("Failed to update Apple Music presence", error);
        } finally {
            this.isUpdating = false;
        }
    }
});
