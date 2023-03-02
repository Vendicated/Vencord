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

import { FluxStore } from "@webpack/types";

// Discord Spotify Types

export interface SpotifySocket {
    accessToken: string;
    accountId: string;
    connected: boolean;
}
export interface Account {
    accountId: string;
    accessToken: string;
    connectionId: string;
    isPremium: boolean;
    socket: WebSocket;
}

export interface PlayerTrack {
    id: string;
    name: string;
    duration: number;
    isLocal: boolean;
    album: {
        id: string;
        name: string;
        image: {
            height: number;
            width: number;
            url: string;
        };
    };
    artists: {
        id: string;
        href: string;
        name: string;
        type: string;
        uri: string;
    }[];
}

export interface PlayerState {
    accountId: string;
    track: PlayerTrack | null;
    volumePercent: number,
    isPlaying: boolean,
    repeat: boolean,
    position: number,
    context?: any;
    device?: SpotifyDevice;

    // added by patch
    actualRepeat: RepeatState;
}

export interface SpotifyDevice {
    id: string;
    is_active: boolean;
}

export type RepeatState = "off" | "track" | "context";

export interface SpotifyStore extends FluxStore {
    __getLocalVars(): {
        accounts: Record<string, Account>;
    };
    getActiveSocketAndDevice(): { socket: SpotifySocket; device: SpotifyDevice; };
}

export type SpotifyHttp = Record<"get" | "put" | "post", (accountId: string, accessToken: string, options: { url: string; }) => Promise<any>>;

// Spotify API Types

export const enum RestrictionReason {
    Market = "market",
    Product = "product",
    Explicit = "explicit",
}

interface ApiResource {
    type: string;
    id: string;
    name: string;
    external_urls: { spotify: string; };
    href: string;
    uri: string;
}
export interface Pagination<T> {
    href: string;
    items: T[];
    limit: number;
    next: string | null;
    offset: number;
    previous: string | null;
    total: number;
}
export interface ResourceImage {
    height: number;
    width: number;
    url: string;
}
type Followers = { total: number; };

export enum ResourceType {
    Track = "track",
    Album = "album",
    Playlist = "playlist",
    Artist = "artist",
    User = "user",
}
export interface Track extends ApiResource {
    type: ResourceType.Track;

    album: Album<false>;
    artists: Artist[];

    restrictions?: { reason: string; };
    disc_number: number;
    duration_ms: number;
    explicit: boolean;
    is_local: boolean;
    preview_url: string | null;
    track_number: number;
    popularity: number;
}
export interface Album<HasTracks = true> extends ApiResource {
    type: ResourceType.Album;

    artists: Artist[];
    tracks: HasTracks extends true ? Pagination<Track> : never;

    images: ResourceImage[];
    album_type: "album" | "single" | "compilation";
    genres: string[];
    restrictions?: { reason: string; };
    release_date: string;
    release_date_precision: "year" | "month" | "day";
    label: string;
    popularity: number;
}
export interface PlaylistItem {
    added_at: string;
    added_by: PartialUser;
    is_local: boolean;
    track: Track;
}
export interface Playlist extends ApiResource {
    type: ResourceType.Playlist;

    owner: User;
    tracks: Pagination<PlaylistItem>;

    images: ResourceImage[];
    followers: Followers;
    description: string;
    collaborative: boolean;
    public: boolean;
    snapshot_id: string;
}
export interface Artist extends ApiResource {
    type: ResourceType.Artist;

    images: ResourceImage[];
    followers: Followers;
    genres: string[];
    popularity: number;
}
export interface PartialUser extends ApiResource {
    type: ResourceType.User;
}
export interface User extends PartialUser {
    images: ResourceImage[];
    followers: Followers;
    display_name: string;
}
export interface TopTracks {
    tracks: Track[];
}

// Resource Types

export type Resource = Track | Album | Playlist | Artist | User;

// Query Types

export type MarketQuery = { market: string; };
