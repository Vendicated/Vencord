/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxStore } from "@webpack/types";

export interface ApplicationStreamPreviewStore extends FluxStore {
    getIsPreviewLoading: (guildId: string | bigint | null, channelId: string | bigint, ownerId: string | bigint) => boolean;
    getPreviewURL: (guildId: string | bigint | null, channelId: string | bigint, ownerId: string | bigint) => Promise<string | null>;
    getPreviewURLForStreamKey: (streamKey: string) => ReturnType<ApplicationStreamPreviewStore["getPreviewURL"]>;
}

export interface ApplicationStream {
    streamType: string;
    guildId: string | null;
    channelId: string;
    ownerId: string;
}

export interface Stream extends ApplicationStream {
    state: string;
}

export interface RTCStream {
    region: string,
    streamKey: string,
    viewerIds: string[];
}

export interface StreamMetadata {
    id: string | null,
    pid: number | null,
    sourceName: string | null;
}

export interface StreamingStoreState {
    activeStreams: [string, Stream][];
    rtcStreams: { [key: string]: RTCStream; };
    streamerActiveStreamMetadatas: { [key: string]: StreamMetadata | null; };
    streamsByUserAndGuild: { [key: string]: { [key: string]: ApplicationStream; }; };
}

/**
 * example how a stream key could look like: `call(type of connection):1116549917987192913(channelId):305238513941667851(ownerId)`
 */
export interface ApplicationStreamingStore extends FluxStore {
    getActiveStreamForApplicationStream: (stream: ApplicationStream) => Stream | null;
    getActiveStreamForStreamKey: (streamKey: string) => Stream | null;
    getActiveStreamForUser: (userId: string | bigint, guildId?: string | bigint | null) => Stream | null;
    getAllActiveStreams: () => Stream[];
    getAllApplicationStreams: () => ApplicationStream[];
    getAllApplicationStreamsForChannel: (channelId: string | bigint) => ApplicationStream[];
    getAllActiveStreamsForChannel: (channelId: string | bigint) => Stream[];
    getAnyStreamForUser: (userId: string | bigint) => Stream | ApplicationStream | null;
    getStreamForUser: (userId: string | bigint, guildId?: string | bigint | null) => Stream | null;
    getCurrentUserActiveStream: () => Stream | null;
    getLastActiveStream: () => Stream | null;
    getState: () => StreamingStoreState;
    getRTCStream: (streamKey: string) => RTCStream | null;
    getStreamerActiveStreamMetadata: () => StreamMetadata;
    getViewerIds: (stream: ApplicationStream) => string[];
    isSelfStreamHidden: (channelId: string | bigint | null) => boolean;
}
