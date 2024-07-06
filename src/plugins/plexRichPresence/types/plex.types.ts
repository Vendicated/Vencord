/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface TrackMediaContainer {
    size: number;
    Metadata: Array<{
        duration: number;
        grandparentTitle: string;
        parentTitle: string;
        originalTitle: string;
        parentYear: number;
        thumb: string;
        title: string;
        type: "track";
        viewOffset: number;
        User: {
            title: string;
        };
    }>;
}

export interface MovieMediaContainer {
    size: number;
    Metadata: Array<{
        duration: number;
        tagline: string;
        thumb: string;
        title: string;
        type: "movie";
        viewOffset: number;
        year: number;
        Genre: Array<{
            tag: string;
        }>;
        Director: Array<{
            tag: string;
        }>;
        User: {
            title: string;
        };
    }>;
}

export interface EpisodeMediaContainer {
    size: number;
    Metadata: Array<{
        duration: number;
        grandparentTitle: string;
        index: number;
        parentIndex: number;
        title: string;
        type: "episode";
        viewOffset: number;
        year: number;
        Director: Array<{
            tag: string;
        }>;
        User: {
            title: string;
        };
    }>;
}
