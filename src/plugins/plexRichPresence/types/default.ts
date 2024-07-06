/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

export interface Activity {
    state: string;
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
    type: number;
    flags: number;
}

export const enum ActivityType {
    Playing,
    Streaming,
    Listening,
    Watching
}

export interface MovieInformation {
    title: string;
    year: string;
    director: string;
    genre: string;
    duration: number;
    viewOffset: number;
    rating: string;
    artImageUrl: string;
}

export interface EpisodeInformation {
    showTitle: string;
    year: string;
    director: string;
    episodeTitle: string;
    seasonNumber: number;
    episodeNumber: number;
    artImageUrl: string;
    duration: number;
    rating: string;
    viewOffset: number;
}

export interface MusicInformation {
    title: string;
    artist: string;
    album: string;
    albumArtist: string;
    year: string;
    duration: number;
    viewOffset: number;
    artImageUrl: string;
}

export interface TMDBMovie {
    vote_average: number;
    poster_path: string;
}

interface SessionMusic {
    id: string;
    data: MusicInformation;
    type: "music";
}

interface SessionEpisode {
    id: string;
    data: EpisodeInformation;
    type: "episode";
}

interface SessionMovie {
    id: string;
    data: MovieInformation;
    type: "movie";
}

export type ActiveSessions = SessionMusic | SessionEpisode | SessionMovie;
