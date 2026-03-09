/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface JfSession {
    UserId: string;
    NowPlayingItem?: JfNowPlayingItem;
    PlayState?: {
        IsPaused?: boolean;
        PositionTicks?: number;
    };
}

interface JfNowPlayingItem {
    Name?: string;
    Type?: string;
    Id?: string;
    SeriesId?: string;
    SeriesName?: string;
    Artists?: string[];
    AlbumArtist?: string;
    Album?: string;
    ParentIndexNumber?: number;
    IndexNumber?: number;
    ProductionYear?: number;
    RunTimeTicks?: number;
    ImageTags?: { Primary?: string; };
}

export interface JfMediaData {
    name: string;
    type: string;
    artist?: string;
    album?: string;
    seriesName?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    year?: number;
    url?: string;
    imageUrl?: string;
    duration?: number;
    position?: number;
    isPaused?: boolean;
}
