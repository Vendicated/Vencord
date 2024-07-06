/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseClient } from "../libs/BaseClient";
import { ActiveSessions } from "../types/default";
import { EpisodeMediaContainer, MovieMediaContainer, TrackMediaContainer } from "../types/plex.types";

type SessionResponse = {
    MediaContainer: MovieMediaContainer | TrackMediaContainer | EpisodeMediaContainer;
};

interface TMDBMovie {
    poster_path: string;
    vote_average: number;
}

const IMAGE_API_KEY = "8faf724c7574c968783b7a0ac5e4243d";
const IMAGE_URL = "https://api.imgbb.com/1/upload";

export class PlexClient extends BaseClient {
    private url: string;
    private apiKey: string;
    public tmdbApiKey: string;

    constructor({ url, apiKey, tmdbApiKey }: ServerProps) {
        super();

        this.url = url.endsWith("/") ? url.slice(0, -1) : url;
        this.tmdbApiKey = tmdbApiKey;
        this.apiKey = apiKey;
    }

    async getActiveSessions(): Promise<ActiveSessions | null> {
        const res = await fetch(`${this.url}/status/sessions`, {
            headers: {
                "X-Plex-Token": this.apiKey,
                "Accept": "application/json"
            }
        });

        // parse the data to match the types
        let response: ActiveSessions;
        const data = await res.json() as SessionResponse;
        if (!data.MediaContainer.size) return null;

        const sessionInfo = data.MediaContainer.Metadata[0];
        if (!sessionInfo) return null;

        if (sessionInfo.type === "episode") {
            const tmdbInfo = await this.getInformationFromTMDB(sessionInfo.grandparentTitle, "tv");
            const artImageUrl = `https://image.tmdb.org/t/p/w300${tmdbInfo.poster_path}`;

            response = {
                type: "episode",
                id: sessionInfo.title,
                data: {
                    director: sessionInfo?.Director[0]?.tag || "N/A",
                    duration: sessionInfo.duration,
                    episodeNumber: sessionInfo.index,
                    episodeTitle: sessionInfo.title,
                    seasonNumber: sessionInfo.parentIndex,
                    showTitle: sessionInfo.grandparentTitle,
                    viewOffset: sessionInfo.viewOffset,
                    year: String(sessionInfo.year),
                    rating: tmdbInfo.vote_average.toFixed(1),
                    artImageUrl: artImageUrl
                }
            };
        } else if (sessionInfo.type === "movie") {
            const tmdbInfo = await this.getInformationFromTMDB(sessionInfo.title, "movie");
            const artImageUrl = `https://image.tmdb.org/t/p/w300${tmdbInfo.poster_path}`;

            response = {
                type: "movie",
                id: sessionInfo.title,
                data: {
                    director: sessionInfo?.Director[0]?.tag || "N/A",
                    duration: sessionInfo.duration,
                    genre: sessionInfo?.Genre[0]?.tag || "N/A",
                    title: sessionInfo.title,
                    viewOffset: sessionInfo.viewOffset,
                    artImageUrl: artImageUrl,
                    rating: tmdbInfo.vote_average.toFixed(1),
                    year: String(sessionInfo.year)
                }
            };
        } else if (sessionInfo.type === "track") {
            const artImageUrl = await this.uploadArtImage(sessionInfo.thumb);
            response = {
                type: "music",
                id: sessionInfo.title,
                data: {
                    album: sessionInfo.parentTitle,
                    albumArtist: sessionInfo.originalTitle,
                    artist: sessionInfo.grandparentTitle,
                    title: sessionInfo.title,
                    year: String(sessionInfo.parentYear),
                    duration: sessionInfo.duration,
                    viewOffset: sessionInfo.viewOffset,
                    artImageUrl: artImageUrl
                }
            };
        } else {
            return null;
        }

        return response;
    }

    async uploadArtImage(thumb: string): Promise<string> {
        const plexImageUrl = `${this.url}/photo/:/transcode?width=128&height=128&minSize=1&upscale=1&format=png&url=${thumb}&X-Plex-Token=${this.apiKey}`;
        const imageBlob = await fetch(plexImageUrl).then(r => r.blob());

        const formData = new FormData();
        formData.append("image", imageBlob, "image.png");

        const res = await fetch(`${IMAGE_URL}?key=${IMAGE_API_KEY}`, {
            method: "POST",
            body: formData
        });

        if (!res.ok) throw new Error("Failed to upload image");
        const data = await res.json();

        return data.data.url as string;
    }
}

interface ServerProps {
    url: string;
    apiKey: string;
    tmdbApiKey: string;
}
