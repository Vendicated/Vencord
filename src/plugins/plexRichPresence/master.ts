/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { ApplicationAssetUtils } from "@webpack/common";

import { EmbyClient } from "./clients/EmbyClient";
import { PlexClient } from "./clients/PlexClient";
import { settings } from "./index";
import { BaseClient } from "./libs/BaseClient";
import { millisecondsToMinutes, replaceAll, setActivity } from "./libs/utils";
import { Activity, ActivityType, EpisodeInformation, MovieInformation, MusicInformation } from "./types/default";

const APPLICATION_ID = "1255385666242609174";
const defaultLastActivity = { title: "" };

async function getApplicationAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(APPLICATION_ID, [key]))[0];
}

export default class PlexRichPresence {
    private apiClient?: BaseClient;
    private interval?: NodeJS.Timeout;
    private logger = new Logger("PlexRichPresence");
    private lastActivity = defaultLastActivity;

    constructor() {
        if (!settings.store.serverApiKey || !settings.store.serverAddress)
            this.logger.error("Missing Plex API key or server address");

        const authenticationPayload = {
            url: settings.store.serverAddress,
            apiKey: settings.store.serverApiKey,
            tmdbApiKey: settings.store.tmdbApiKey
        };

        if (settings.store.server === "plex") {
            this.apiClient = new PlexClient(authenticationPayload);
        } else if (settings.store.server === "emby") {
            this.apiClient = new EmbyClient(authenticationPayload);
        } else {
            this.logger.error("Invalid server type");
            return;
        }

        this.updateUserPresence();
        this.interval = setInterval(this.updateUserPresence.bind(this), 10000);
    }

    async updateUserPresence() {
        if (!settings.store.serverApiKey || !settings.store.serverAddress || !this.apiClient) return;

        const activeSession = await this.apiClient.getActiveSessions(settings.store.users.split(","));
        if (!activeSession?.data) {
            if (this.lastActivity) setActivity(null);
            return this.lastActivity = { title: "" };
        }

        if (this.lastActivity.title === activeSession.id) return;
        this.lastActivity = { title: activeSession.id };

        let parsedActivity: Activity | null = null;

        if (activeSession.type === "music") {
            parsedActivity = await this.parseActivityMusicPayload(activeSession.data);
        } else if (activeSession.type === "movie") {
            parsedActivity = await this.parseActivityMoviePayload(activeSession.data);
        } else if (activeSession.type === "episode") {
            parsedActivity = await this.parseActivityEpisodePayload(activeSession.data);
        } else {
            setActivity(null);
            return this.lastActivity = { title: "" };
        }

        if (parsedActivity) {
            setActivity(parsedActivity);
        }
    }

    async parseActivityMusicPayload(sessionInfo: MusicInformation): Promise<Activity | null> {
        const placeholders = {
            "{title}": sessionInfo.title,
            "{artist}": sessionInfo?.artist || sessionInfo.albumArtist,
            "{album}": sessionInfo.album,
            "{albumArtist}": sessionInfo.albumArtist || sessionInfo.artist,
            "{year}": sessionInfo.year,
            "{duration}": millisecondsToMinutes(sessionInfo.duration)
        };

        return {
            application_id: APPLICATION_ID,
            name: replaceAll(settings.store.musicFirstRow, placeholders),
            details: replaceAll(settings.store.musicSecondRow, placeholders),
            state: replaceAll(settings.store.musicThirdRow, placeholders),
            assets: {
                large_image: await getApplicationAsset(sessionInfo.artImageUrl),
                small_image: await getApplicationAsset(`${settings.store.server}_icon`),
            },
            timestamps: {
                start: Date.now(),
                end: Date.now() + (sessionInfo.duration - sessionInfo.viewOffset)
            },
            flags: 1 << 0,
            type: ActivityType.Playing
        } as Activity;
    }

    async parseActivityMoviePayload(sessionInfo: MovieInformation): Promise<Activity | null> {
        const placeholders = {
            "{title}": sessionInfo.title,
            "{year}": sessionInfo.year,
            "{rating}": sessionInfo.rating,
            "{director}": sessionInfo.director,
            "{genre}": sessionInfo.genre
        };

        return {
            application_id: APPLICATION_ID,
            name: replaceAll(settings.store.movieFirstRow, placeholders),
            details: replaceAll(settings.store.movieSecondRow, placeholders),
            state: replaceAll(settings.store.movieThirdRow, placeholders),
            assets: {
                large_image: await getApplicationAsset(sessionInfo.artImageUrl),
                small_image: await getApplicationAsset(`${settings.store.server}_icon`),
            },
            timestamps: {
                start: Date.now(),
                end: Date.now() + (sessionInfo.duration - sessionInfo.viewOffset)
            },
            flags: 1 << 0,
            type: ActivityType.Playing
        };
    }

    async parseActivityEpisodePayload(sessionInfo: EpisodeInformation): Promise<Activity | null> {
        const placeholders = {
            "{title}": sessionInfo.showTitle,
            "{year}": sessionInfo.year,
            "{rating}": sessionInfo.rating,
            "{director}": sessionInfo.director,
            "{episode}": sessionInfo.episodeTitle,
            "{sn:ep}": `S${String(sessionInfo.seasonNumber).padStart(2, "0")}:E${String(sessionInfo.episodeNumber).padStart(2, "0")}`
        };

        return {
            application_id: APPLICATION_ID,
            name: replaceAll(settings.store.episodeFirstRow, placeholders),
            details: replaceAll(settings.store.episodeSecondRow, placeholders),
            state: replaceAll(settings.store.episodeThirdRow, placeholders),
            assets: {
                large_image: await getApplicationAsset(sessionInfo.artImageUrl),
                small_image: await getApplicationAsset(`${settings.store.server}_icon`),
            },
            timestamps: {
                start: Date.now(),
                end: Date.now() + (sessionInfo.duration - sessionInfo.viewOffset)
            },
            flags: 1 << 0,
            type: ActivityType.Playing
        };
    }

    stopClient() {
        if (this.interval) clearInterval(this.interval);
        setActivity(null);
    }
}
