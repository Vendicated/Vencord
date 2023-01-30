/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

export enum ColorStyle {
    Vibrant = "vibrant",
    Pastel = "pastel",
    Muted = "muted",
    Discord = "discord",
}

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
export interface SpotifyStore {
    __getLocalVars(): {
        accounts: Record<string, Account>;
    };
}
export interface SpotifyHttp {
    get(accountId: string, accessToken: string, options: { url: string; }): Promise<any>;
    put(accountId: string, accessToken: string, options: { url: string; }): Promise<any>;
}

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
export interface ArtistWithoutTopTracks extends ApiResource {
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

export interface Artist extends ArtistWithoutTopTracks {
    top_tracks: Track[];
}
export type Resource = Track | Album | Playlist | Artist | User;
