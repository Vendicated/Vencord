import { FluxStore } from "..";

export interface SpotifyDevice {
    id: string;
    is_active: boolean;
    is_private_session: boolean;
    is_restricted: boolean;
    name: string;
    supports_volume: boolean;
    type: string;
    volume_percent: number;
}

export interface SpotifySocket {
    accessToken: string;
    accountId: string;
    connectionId: string;
    isPremium: boolean;
    socket: WebSocket;
}

export interface SpotifySocketAndDevice {
    socket: SpotifySocket;
    device: SpotifyDevice;
}

export interface SpotifyArtist {
    id: string;
    name: string;
}

export interface SpotifyImage {
    url: string;
    height: number;
    width: number;
}

export interface SpotifyAlbum {
    id: string;
    name: string;
    type: string;
    image: SpotifyImage | null;
}

export interface SpotifyTrack {
    id: string;
    name: string;
    duration: number;
    isLocal: boolean;
    type: string;
    album: SpotifyAlbum;
    artists: SpotifyArtist[];
}

export interface SpotifyPlayerState {
    track: SpotifyTrack;
    startTime: number;
    context: { uri: string } | null;
}

export interface SpotifyActivity {
    name: string;
    assets: {
        large_image?: string;
        large_text?: string;
    };
    details: string;
    state: string | undefined;
    timestamps: {
        start: number;
        end: number;
    };
    party: {
        id: string;
    };
    sync_id?: string;
    flags?: number;
    metadata?: {
        context_uri: string | undefined;
        album_id: string;
        artist_ids: string[];
        type: string;
        button_urls: string[];
    };
}

export interface SpotifySyncingWith {
    oderId: string;
    partyId: string;
    sessionId: string;
    userId: string;
}

export class SpotifyStore extends FluxStore {
    hasConnectedAccount(): boolean;
    getActiveSocketAndDevice(): SpotifySocketAndDevice | null;
    getPlayableComputerDevices(): SpotifySocketAndDevice[];
    canPlay(deviceId: string): boolean;
    getSyncingWith(): SpotifySyncingWith | undefined;
    wasAutoPaused(): boolean;
    getLastPlayedTrackId(): string | undefined;
    getTrack(): SpotifyTrack | null;
    getPlayerState(accountId: string): SpotifyPlayerState | null;
    shouldShowActivity(): boolean;
    getActivity(): SpotifyActivity | null;
}
