/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface EpisodeMediaContainer {
    NowPlayingItem: {
        SeriesName: string; // Series Name
        ParentIndexNumber: number; // Season Number
        IndexNumber: number; // Episode Number
        Name: string; // Episode Name
        Genres: Array<string>; // ["Dance", "Pop"]
        ProductionYear: number; // 2017
        RunTimeTicks: number; // ticks / 10000 = milliseconds
        AlbumPrimaryImageTag: string;
        Type: "Episode";
    };
    PlayState: {
        PositionTicks: number;
    };
}

export interface TrackMediaContainer {
    NowPlayingItem: {
        Id: string; // 17823
        Name: string; // Song Name - "Ballin'"
        Album: string; // Album Name - "Diamonds"
        AlbumArtist: string;// Album Artist - "Lil Peep"
        Artists: Array<string>; // Song Artists ["Lil Peep, ILOVEMAKONNEN"]
        ProductionYear: number; // 2017
        RunTimeTicks: number; // ticks / 10000 = milliseconds
        AlbumPrimaryImageTag: string; // "710c98db0159c1412dd70d6568775617"
        Type: "Audio";
    };
    PlayState: {
        PositionTicks: number; // ticks / 10000 = milliseconds
    };
}

export interface MovieMediaContainer {
    NowPlayingItem: {
        Name: string; // Movie Name
        ProductionYear: number; // 2017
        Genres: Array<string>; // ["Dance", "Pop"]
        RunTimeTicks: number; // ticks / 10000 = milliseconds
        CommunityRating: number; // 5.9
        Type: "Movie";
    };
    PlayState: {
        PositionTicks: number; // ticks / 10000 = milliseconds
    };
}
