/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface StreamCreateEvent {
    type: "STREAM_CREATE";
    streamKey: string;
    rtcServerId: string;
    region: string;
    viewerIds: number[];
    paused: boolean;
}

export interface StreamDeleteEvent {
    type: "STREAM_DELETE";
    streamKey: string;
    reason: string;
    unavailable: unknown;
}

export type StreamKey =
    | {
        voiceChannelType: "call";
        guildId?: undefined;
        channelId: string;
        userId: string;
    }
    | {
        voiceChannelType: "guild";
        guildId: string;
        channelId: string;
        userId: string;
    };
