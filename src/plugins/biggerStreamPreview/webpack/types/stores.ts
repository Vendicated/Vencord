/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import type { FluxStore } from "@vencord/discord-types";

export interface ApplicationStreamPreviewStore extends FluxStore {
    getIsPreviewLoading: (guildId: string | null | undefined, channelId: string, ownerId: string) => boolean;
    getPreviewURL: (guildId: string | null | undefined, channelId: string, ownerId: string) => string | null;
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
    activeStreams: [streamKey: string, stream: Stream][];
    rtcStreams: { [streamKey: string]: RTCStream; };
    streamerActiveStreamMetadatas: { [streamKey: string]: StreamMetadata | null; };
    streamsByUserAndGuild: { [userId: string]: { [guildId: string]: ApplicationStream; }; };
}

/**
 * example how a stream key could look like: `call(type of connection):1116549917987192913(channelId):305238513941667851(ownerId)`
 */
export interface ApplicationStreamingStore extends FluxStore {
    getActiveStreamForApplicationStream: (stream: ApplicationStream) => Stream | null;
    getActiveStreamForStreamKey: (streamKey: string) => Stream | null;
    getActiveStreamForUser: (userId: string, guildId?: string | null) => Stream | null;
    getAllActiveStreams: () => Stream[];
    getAllApplicationStreams: () => ApplicationStream[];
    getAllApplicationStreamsForChannel: (channelId: string) => ApplicationStream[];
    getAllActiveStreamsForChannel: (channelId: string) => Stream[];
    getAnyStreamForUser: (userId: string) => Stream | ApplicationStream | null;
    getStreamForUser: (userId: string, guildId?: string | null) => Stream | null;
    getCurrentUserActiveStream: () => Stream | null;
    getLastActiveStream: () => Stream | null;
    getState: () => StreamingStoreState;
    getRTCStream: (streamKey: string) => RTCStream | null;
    getStreamerActiveStreamMetadata: () => StreamMetadata;
    getViewerIds: (stream: ApplicationStream) => string[];
    isSelfStreamHidden: (channelId: string | null) => boolean;
}
