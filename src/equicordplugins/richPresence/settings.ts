/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { SettingsPanel } from "./SettingsPanel";
import { NameFormat } from "./types";

export let onServiceChange: (() => void) | null = null;
export function setOnServiceChange(fn: (() => void) | null) { onServiceChange = fn; }

export const settings = definePluginSettings({
    enabled: {
        description: "Enable rich presence services.",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false,
        onChange: () => onServiceChange?.(),
    },
    serviceSettings: {
        type: OptionType.COMPONENT,
        description: "Service configuration.",
        component: SettingsPanel,
    },

    // Per-service enable toggles
    abs_enabled: {
        description: "Enable AudioBookShelf presence.",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
        onChange: () => onServiceChange?.(),
    },
    tosu_enabled: {
        description: "Enable osu! (tosu) presence.",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
        onChange: () => onServiceChange?.(),
    },
    sfm_enabled: {
        description: "Enable stats.fm presence.",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
        onChange: () => onServiceChange?.(),
    },
    jf_enabled: {
        description: "Enable Jellyfin presence.",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
        onChange: () => onServiceChange?.(),
    },
    lb_enabled: {
        description: "Enable ListenBrainz presence.",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
        onChange: () => onServiceChange?.(),
    },
    gr_enabled: {
        description: "Enable Gensokyo Radio presence.",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
        onChange: () => onServiceChange?.(),
    },

    // AudioBookShelf
    abs_serverUrl: {
        description: "AudioBookShelf server URL.",
        type: OptionType.STRING,
        default: "",
        hidden: true,
    },
    abs_username: {
        description: "AudioBookShelf username.",
        type: OptionType.STRING,
        default: "",
        hidden: true,
    },
    abs_password: {
        description: "AudioBookShelf password.",
        type: OptionType.STRING,
        default: "",
        hidden: true,
    },

    // stats.fm
    sfm_username: {
        description: "Stats.fm username.",
        type: OptionType.STRING,
        default: "",
        hidden: true,
    },
    sfm_shareUsername: {
        description: "Show link to stats.fm profile.",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
    },
    sfm_shareSong: {
        description: "Show link to song on stats.fm.",
        type: OptionType.BOOLEAN,
        default: true,
        hidden: true,
    },
    sfm_hideWithSpotify: {
        description: "Hide stats.fm presence if Spotify is running.",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
    },
    sfm_hideWithExternalRPC: {
        description: "Hide stats.fm presence if an external RPC is running.",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
    },
    sfm_statusName: {
        description: "Custom status text.",
        type: OptionType.STRING,
        default: "Stats.fm",
        hidden: true,
    },
    sfm_nameFormat: {
        description: "Name format.",
        type: OptionType.SELECT,
        options: [
            { label: "Use custom status name", value: NameFormat.StatusName, default: true },
            { label: "Use format 'artist - song'", value: NameFormat.ArtistFirst },
            { label: "Use format 'song - artist'", value: NameFormat.SongFirst },
            { label: "Use artist name only", value: NameFormat.ArtistOnly },
            { label: "Use song name only", value: NameFormat.SongOnly },
            { label: "Use album name", value: NameFormat.AlbumName },
        ],
        hidden: true,
    },
    sfm_useListeningStatus: {
        description: "Show listening status.",
        type: OptionType.BOOLEAN,
        default: true,
        hidden: true,
    },
    sfm_missingArt: {
        description: "Fallback when art is missing.",
        type: OptionType.SELECT,
        options: [
            { label: "Use large Stats.fm logo", value: "StatsFmLogo", default: true },
            { label: "Use generic placeholder", value: "placeholder" },
        ],
        hidden: true,
    },
    sfm_showLogo: {
        description: "Show Stats.fm logo next to album art.",
        type: OptionType.BOOLEAN,
        default: true,
        hidden: true,
    },
    sfm_alwaysHideArt: {
        description: "Disable downloading album art.",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
    },

    // Jellyfin
    jf_serverUrl: {
        description: "Jellyfin server URL.",
        type: OptionType.STRING,
        default: "",
        hidden: true,
    },
    jf_apiKey: {
        description: "Jellyfin API key.",
        type: OptionType.STRING,
        default: "",
        hidden: true,
    },
    jf_userId: {
        description: "Jellyfin user ID.",
        type: OptionType.STRING,
        default: "",
        hidden: true,
    },
    jf_nameDisplay: {
        description: "Name display format.",
        type: OptionType.SELECT,
        options: [
            { label: "Series/Movie Name", value: "default", default: true },
            { label: "Series - Episode/Track/Movie Name", value: "full" },
            { label: "Custom", value: "custom" },
        ],
        hidden: true,
    },
    jf_customName: {
        description: "Custom name template.",
        type: OptionType.STRING,
        default: "",
        hidden: true,
    },
    jf_coverType: {
        description: "Cover type for TV shows.",
        type: OptionType.SELECT,
        options: [
            { label: "Series Cover", value: "series", default: true },
            { label: "Episode Cover", value: "episode" },
        ],
        hidden: true,
    },
    jf_episodeFormat: {
        description: "Episode number format.",
        type: OptionType.SELECT,
        options: [
            { label: "S01E01", value: "long", default: true },
            { label: "1x01", value: "short" },
            { label: "Season 1 Episode 1", value: "fulltext" },
        ],
        hidden: true,
    },
    jf_showEpisodeName: {
        description: "Show episode name after season/episode info.",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
    },
    jf_overrideType: {
        description: "Override rich presence type.",
        type: OptionType.SELECT,
        options: [
            { label: "Off", value: "off", default: true },
            { label: "Listening", value: "2" },
            { label: "Playing", value: "0" },
            { label: "Streaming", value: "1" },
            { label: "Watching", value: "3" },
        ],
        hidden: true,
    },
    jf_showPausedState: {
        description: "Show presence when media is paused.",
        type: OptionType.BOOLEAN,
        default: true,
        hidden: true,
    },
    jf_privacyMode: {
        description: "Hide media details.",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
    },

    // ListenBrainz
    lb_username: {
        description: "ListenBrainz username.",
        type: OptionType.STRING,
        default: "",
        hidden: true,
    },
    lb_mbContact: {
        description: "MusicBrainz contact for user agent.",
        type: OptionType.STRING,
        default: "",
        hidden: true,
    },
    lb_shareUsername: {
        description: "Show link to ListenBrainz profile.",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
    },
    lb_shareSong: {
        description: "Show link to song on ListenBrainz.",
        type: OptionType.BOOLEAN,
        default: true,
        hidden: true,
    },
    lb_hideWithSpotify: {
        description: "Hide presence if Spotify is running.",
        type: OptionType.BOOLEAN,
        default: true,
        hidden: true,
    },
    lb_hideWithActivity: {
        description: "Hide presence if any other presence exists.",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
    },
    lb_useTimeBar: {
        description: "Use track duration to display a time bar.",
        type: OptionType.BOOLEAN,
        default: true,
        hidden: true,
    },
    lb_statusName: {
        description: "Custom status text.",
        type: OptionType.STRING,
        default: "some music",
        hidden: true,
    },
    lb_nameFormat: {
        description: "Name format.",
        type: OptionType.SELECT,
        options: [
            { label: "Use custom status name", value: NameFormat.StatusName, default: true },
            { label: "Use format 'artist - song'", value: NameFormat.ArtistFirst },
            { label: "Use format 'song - artist'", value: NameFormat.SongFirst },
            { label: "Use artist name only", value: NameFormat.ArtistOnly },
            { label: "Use song name only", value: NameFormat.SongOnly },
            { label: "Use album name", value: NameFormat.AlbumName },
        ],
        hidden: true,
    },
    lb_useListeningStatus: {
        description: "Show listening status.",
        type: OptionType.BOOLEAN,
        default: true,
        hidden: true,
    },
    lb_missingArt: {
        description: "Fallback when art is missing.",
        type: OptionType.SELECT,
        options: [
            { label: "Use large ListenBrainz logo", value: "listenbrainzLogo", default: true },
            { label: "Use generic placeholder", value: "placeholder" },
        ],
        hidden: true,
    },
    lb_useLogo: {
        description: "Show ListenBrainz logo on album art.",
        type: OptionType.BOOLEAN,
        default: true,
        hidden: true,
    },

    // Gensokyo Radio
    gr_refreshInterval: {
        description: "Refresh interval in seconds.",
        type: OptionType.SLIDER,
        markers: [1, 2, 2.5, 3, 5, 10, 15],
        default: 15,
        hidden: true,
    },
});

export type SettingsStore = typeof settings["store"];
