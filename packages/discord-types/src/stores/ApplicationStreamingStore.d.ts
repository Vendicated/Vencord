import { FluxStore } from "..";

export interface ApplicationStreamPreviewStore extends FluxStore {
    getIsPreviewLoading: (guildId: string | bigint | null, channelId: string | bigint, ownerId: string | bigint) => boolean;
    getPreviewURL: (guildId: string | bigint | null, channelId: string | bigint, ownerId: string | bigint) => Promise<string | null>;
    getPreviewURLForStreamKey: (streamKey: string) => ReturnType<ApplicationStreamPreviewStore["getPreviewURL"]>;
}

export interface ApplicationStream {
    channelId: string;
    guildId: string | null;
    ownerId: string;
    streamType: string;
}

export interface ActiveStream extends ApplicationStream {
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
    activeStreams: [string, ActiveStream][];
    rtcStreams: { [key: string]: RTCStream; };
    streamerActiveStreamMetadatas: { [key: string]: StreamMetadata | null; };
    streamsByUserAndGuild: { [key: string]: { [key: string]: ApplicationStream; }; };
}

export class ApplicationStreamingStore extends FluxStore {
    getActiveStreamForApplicationStream: (stream: ApplicationStream) => ActiveStream | null;
    getActiveStreamForStreamKey: (streamKey: string) => ActiveStream | null;
    getActiveStreamForUser: (userId: string | bigint, guildId?: string | bigint | null) => ActiveStream | null;
    getAllActiveStreams: () => ActiveStream[];
    getAllApplicationStreams: () => ApplicationStream[];
    getAllApplicationStreamsForChannel: (channelId: string | bigint) => ApplicationStream[];
    getAllActiveStreamsForChannel: (channelId: string | bigint) => ActiveStream[];
    getAnyStreamForUser: (userId: string | bigint) => ActiveStream | ApplicationStream | null;
    getStreamForUser: (userId: string | bigint, guildId?: string | bigint | null) => ActiveStream | null;
    getCurrentUserActiveStream: () => ActiveStream | null;
    getLastActiveStream: () => ActiveStream | null;
    getState: () => StreamingStoreState;
    getRTCStream: (streamKey: string) => RTCStream | null;
    getStreamerActiveStreamMetadata: () => StreamMetadata;
    getViewerIds: (stream: ApplicationStream) => string[];
    isSelfStreamHidden: (channelId: string | bigint | null) => boolean;
}
