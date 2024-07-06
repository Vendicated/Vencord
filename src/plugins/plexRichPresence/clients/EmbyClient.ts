/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseClient } from "../libs/BaseClient";
import { ActiveSessions } from "../types/default";
import { EpisodeMediaContainer, MovieMediaContainer, TrackMediaContainer } from "../types/emby.types";

const IMAGE_API_KEY = "8faf724c7574c968783b7a0ac5e4243d";
const IMAGE_URL = "https://api.imgbb.com/1/upload";

type SessionResponse = Array<EpisodeMediaContainer | TrackMediaContainer | MovieMediaContainer>;

export class EmbyClient extends BaseClient {
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
        const res = await fetch(`${this.url}/Sessions?isPlaying=true`, {
            headers: {
                "X-Emby-Token": this.apiKey
            }
        });

        let response: ActiveSessions;
        const data = await res.json() as SessionResponse;
        if (!data.length) return null;

        const sessionInfo = data[0];
        if (!sessionInfo) return null;

        if (sessionInfo.NowPlayingItem.Type === "Episode") {
            const tmdbInfo = await this.getInformationFromTMDB(sessionInfo.NowPlayingItem.SeriesName, "tv");
            const artImageUrl = `https://image.tmdb.org/t/p/w300${tmdbInfo.poster_path}`;

            response = {
                type: "episode",
                id: sessionInfo.NowPlayingItem.Name,
                data: {
                    director: "N/A",
                    duration: Math.floor(sessionInfo.NowPlayingItem.RunTimeTicks / 10000),
                    episodeNumber: sessionInfo.NowPlayingItem.IndexNumber,
                    episodeTitle: sessionInfo.NowPlayingItem.Name,
                    seasonNumber: sessionInfo.NowPlayingItem.ParentIndexNumber,
                    showTitle: sessionInfo.NowPlayingItem.SeriesName,
                    viewOffset: Math.floor(sessionInfo.PlayState.PositionTicks / 10000),
                    year: String(sessionInfo.NowPlayingItem.ProductionYear),
                    rating: tmdbInfo.vote_average.toFixed(1),
                    artImageUrl: artImageUrl
                }
            };
        } else if (sessionInfo.NowPlayingItem.Type === "Audio") {
            const artImageUrl = await this.uploadArtImage(sessionInfo.NowPlayingItem.Id);
            response = {
                type: "music",
                id: sessionInfo.NowPlayingItem.Name,
                data: {
                    album: sessionInfo.NowPlayingItem.Album,
                    artist: sessionInfo.NowPlayingItem.Artists.join(", "),
                    duration: Math.floor(sessionInfo.NowPlayingItem.RunTimeTicks / 10000),
                    albumArtist: sessionInfo.NowPlayingItem.AlbumArtist,
                    title: sessionInfo.NowPlayingItem.Name,
                    viewOffset: Math.floor(sessionInfo.PlayState.PositionTicks / 10000),
                    year: String(sessionInfo.NowPlayingItem.ProductionYear),
                    artImageUrl
                }
            };
        } else if (sessionInfo.NowPlayingItem.Type === "Movie") {
            const tmdbInfo = await this.getInformationFromTMDB(sessionInfo.NowPlayingItem.Name, "movie");
            const artImageUrl = `https://image.tmdb.org/t/p/w300${tmdbInfo.poster_path}`;

            response = {
                type: "movie",
                id: sessionInfo.NowPlayingItem.Name,
                data: {
                    director: "N/A",
                    duration: Math.floor(sessionInfo.NowPlayingItem.RunTimeTicks / 10000),
                    viewOffset: Math.floor(sessionInfo.PlayState.PositionTicks / 10000),
                    title: sessionInfo.NowPlayingItem.Name,
                    year: String(sessionInfo.NowPlayingItem.ProductionYear),
                    genre: sessionInfo.NowPlayingItem.Genres[0] || "N/A",
                    rating: sessionInfo.NowPlayingItem.CommunityRating.toFixed(1),
                    artImageUrl: artImageUrl
                }
            };
        } else {
            return null;
        }

        return response;
    }

    async uploadArtImage(thumb: string): Promise<string> {
        const embyImageUrl = `${this.url}/emby/Items/${thumb}/Images/Primary`;
        const imageBlob = await fetch(embyImageUrl).then(r => r.blob());

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
