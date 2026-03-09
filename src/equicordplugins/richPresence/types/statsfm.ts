/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface SfmTrackData {
    name: string;
    albums: string;
    artists: string;
    url: string;
    imageUrl?: string;
}

interface Albums {
    id: number;
    image: string;
    name: string;
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

export interface SfmResponse {
    item: Item;
}
