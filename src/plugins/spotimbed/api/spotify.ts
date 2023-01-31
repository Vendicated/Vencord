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

import { filters, findByPropsLazy, mapMangledModuleLazy } from "@webpack";

import { settings } from "../settings";
import { Album, Artist, Pagination, Playlist, Resource, SpotifyHttp, SpotifyStore, Track, User } from "../types";

const API_BASE = "https://api.spotify.com/v1";

const builtinApi: { http: SpotifyHttp; } = mapMangledModuleLazy(
    'type:"SPOTIFY_ACCOUNT_ACCESS_TOKEN_REVOKE"',
    { http: filters.byProps("get", "put") },
);
const spotifyStore: SpotifyStore = findByPropsLazy("getActiveSocketAndDevice");

const resourcePromiseCache = new Map<string, Promise<any>>();

type SearchableResource = Track | Album | Playlist | Artist;
type ResourceMap = { [K in Resource["type"]]: Extract<Resource, { type: K; }>; };

export const spotify = {
    getResource(resourcePath: string) {
        const { accounts } = spotifyStore.__getLocalVars();
        const account = Object.values(accounts)[0];
        if (!account) return Promise.reject(new Error("No accounts stored"));

        if (resourcePromiseCache.has(resourcePath)) return resourcePromiseCache.get(resourcePath)!;

        const resourcePromise = builtinApi.http.get(account.accountId, account.accessToken, {
            url: `${API_BASE}${resourcePath}`,
        }).then(res => res.body).finally(() => {
            resourcePromiseCache.delete(resourcePath);
        });

        resourcePromiseCache.set(resourcePath, resourcePromise);
        return resourcePromise;
    },

    // TODO use _.pick to lessen memory footprint
    getTrack(trackId: string): Promise<Track> {
        return this.getResource(`/tracks/${trackId}?market=${settings.store.market}`);
    },
    getAlbum(albumId: string): Promise<Album> {
        return this.getResource(`/albums/${albumId}?market=${settings.store.market}`);
    },
    getPlaylist(playlistId: string): Promise<Playlist> {
        return this.getResource(`/playlists/${playlistId}?market=${settings.store.market}`);
    },
    getArtist(artistId: string): Promise<Artist> {
        return this.getResource(`/artists/${artistId}`);
    },
    getArtistTopTracks(artistId: string): Promise<{ tracks: Track[]; }> {
        return this.getResource(`/artists/${artistId}/top-tracks?market=${settings.store.market}`);
    },
    getUser(userId: string): Promise<User> {
        return this.getResource(`/users/${userId}`);
    },
    getSearch<TK extends SearchableResource["type"]>(query: string, types: TK[], limit = 20, offset = 0): Promise<{
        [K in TK]: Pagination<ResourceMap[K]>;
    }> {
        return this.getResource(`/search?q=${encodeURIComponent(query)}&type=${types.join(",")}&limit=${limit}&offset=${offset}&market=${settings.store.market}`);
    },
};
