import { ApplicationStream, FluxStore, Stream } from "..";

export interface RTCStream {
    region: string,
    streamKey: string,
    viewerIds: string[];
}

export interface StreamMetadata {
    id: string | null,
    pid: number | null,
    sourceName: string | null;
    previewDisabled?: boolean;
    sourceIcon?: string | null;
    sourceId?: string | null;
}

export interface StreamingStoreState {
    activeStreams: [string, Stream][];
    rtcStreams: { [key: string]: RTCStream; };
    streamerActiveStreamMetadatas: { [key: string]: StreamMetadata | null; };
    streamsByUserAndGuild: { [key: string]: { [key: string]: ApplicationStream; }; };
}

export interface ApplicationStreamingStore extends FluxStore {
    getActiveStreamForApplicationStream: (stream: ApplicationStream) => Stream | null;
    getActiveStreamForStreamKey: (streamKey: string) => Stream | null;
    getActiveStreamForUser: (userId: string | bigint, guildId?: string | bigint | null) => Stream | null;
    getAllActiveStreams: () => Stream[];
    getAllApplicationStreams: () => ApplicationStream[];
    getAllApplicationStreamsForChannel: (channelId: string | bigint) => ApplicationStream[];
    getAllActiveStreamsForChannel: (channelId: string | bigint) => Stream[];
    getAnyStreamForUser: (userId: string | bigint) => Stream | ApplicationStream | null;
    getAnyDiscoverableStreamForUser: (userId: string | bigint) => ApplicationStream | null;
    getStreamForUser: (userId: string | bigint, guildId?: string | bigint | null) => Stream | null;
    getCurrentUserActiveStream: () => Stream | null;
    getLastActiveStream: () => Stream | null;
    getState: () => StreamingStoreState;
    getRTCStream: (streamKey: string) => RTCStream | null;
    getStreamerActiveStreamMetadata: () => StreamMetadata | null;
    getStreamerActiveStreamMetadataForStream: (streamKey: string) => StreamMetadata | null;
    getIsActiveStreamPreviewDisabled: (streamKey: string) => boolean;
    getCurrentAppIntent: () => unknown;
    getStreamingState: () => Omit<StreamingStoreState, "activeStreams"> & { activeStreams: [string, Stream][]; };
    isStreamMarkedFull: (streamKey: string) => boolean;
    getViewerIds: (stream: ApplicationStream | string) => string[];
    isSelfStreamHidden: (channelId: string | bigint | null) => boolean;
}
