/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Core response types
export type PlaybackStatus = 0 | 1 | 3; // 0 = stopped, 1 = playing, 3 = paused
export type BooleanResponse = 0 | 1;
export type VolumeLevel = number; // 0-100
export type EQBand = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type TimeFormat = 0 | 1; // 0 = milliseconds, 1 = seconds
export type RepeatMode = "off" | "track" | "playlist";

// Simplified endpoint definitions with camelCase names
export interface WinampEndpoints {
    // System
    getVersion: { params: {}, response: string; };
    restart: { params: {}, response: BooleanResponse; };
    internet: { params: {}, response: BooleanResponse; };

    // Playback control
    play: { params: {}, response: BooleanResponse; };
    pause: { params: {}, response: BooleanResponse; };
    stop: { params: {}, response: BooleanResponse; };
    next: { params: {}, response: BooleanResponse; };
    prev: { params: {}, response: BooleanResponse; };

    // Playback info
    isPlaying: { params: {}, response: PlaybackStatus; };
    getOutputTime: { params: { frmt: TimeFormat; }, response: number; };
    jumpToTime: { params: { ms: number; }, response: BooleanResponse; };
    getCurrentTitle: { params: {}, response: string; };

    // Volume
    getVolume: { params: {}, response: VolumeLevel; };
    setVolume: { params: { level: number; }, response: BooleanResponse; };
    volumeUp: { params: {}, response: BooleanResponse; };
    volumeDown: { params: {}, response: BooleanResponse; };

    // Playlist
    getListLength: { params: {}, response: number; };
    getListPos: { params: {}, response: number; };
    setPlaylistPos: { params: { index: number; }, response: BooleanResponse; };
    getPlaylistFile: { params: { index?: number; }, response: string; };
    getPlaylistTitle: { params: { index?: number; }, response: string; };
    getPlaylistTitleList: { params: { delim: string; }, response: string; };

    // Modes
    repeat: { params: { enable: BooleanResponse; }, response: BooleanResponse; };
    repeatStatus: { params: {}, response: BooleanResponse; };
    shuffle: { params: { enable: BooleanResponse; }, response: BooleanResponse; };
    shuffleStatus: { params: {}, response: BooleanResponse; };

    // Metadata
    getId3Tag: { params: { tags: string, delim: string, index?: number; }, response: string; };
    hasId3Tag: { params: { index?: number; }, response: BooleanResponse; };

    // EQ
    getEqData: { params: { band: EQBand; }, response: number; };
    setEqData: { params: { band: EQBand, level: number; }, response: BooleanResponse; };
}

// Utility types for type-safe endpoint calls
export type EndpointName = keyof WinampEndpoints;
export type EndpointParams<T extends EndpointName> = WinampEndpoints[T]["params"];
export type EndpointResponse<T extends EndpointName> = WinampEndpoints[T]["response"];
