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

import IpcEvents from "@utils/IpcEvents";
import { NonMethodsKeys } from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";

import { SpotifyPlayerStore as PlayerStore } from "./store";
import { Album, Artist, MarketQuery, Pagination, Playlist, RepeatState, Resource, ResourceImage, SpotifyHttp, SpotifyStore, Track, User } from "./types";
export * from "./types";

const API_BASE = "https://api.spotify.com/v1";

const spotifyHttp: SpotifyHttp = findByPropsLazy("SpotifyAPIMarker");
const spotifyStore: SpotifyStore = findByPropsLazy("getActiveSocketAndDevice");
const useStateFromStores: <T>(
    stores: any[],
    mapper: () => T,
    idk?: null,
    compare?: (old: T, newer: T) => boolean
) => T
    = findByCodeLazy("useStateFromStores");

const resourcePromiseCache = new Map<string, Promise<any>>();

type SearchableResource = Track | Album | Playlist | Artist;
type ResourceMap = { [K in Resource["type"]]: Extract<Resource, { type: K; }>; };
type Query = Record<string, any>;
type PlayerStoreStates = NonMethodsKeys<PlayerStore>;

function makePath(pathname: string, query?: Query) {
    return query ? `${pathname}?${new URLSearchParams(query)}` : pathname;
}

export const Spotify = {
    openExternal(path: string) {
        VencordNative.ipc.invoke(IpcEvents.OPEN_EXTERNAL, "https://open.spotify.com" + path);
    },

    http(method: keyof SpotifyHttp, path: string) {
        const { accounts } = spotifyStore.__getLocalVars();
        const account = Object.values(accounts)[0];
        if (!account) return Promise.reject(new Error("No accounts stored"));

        return spotifyHttp[method](account.accountId, account.accessToken, {
            url: API_BASE + path,
        }).then(res => res.body);
    },
    get(pathname: string, query?: Query) {
        const path = makePath(pathname, query);

        const cachedResourcePromise = resourcePromiseCache.get(path);
        if (cachedResourcePromise) return cachedResourcePromise;

        const resourcePromise = this.http("get", path).finally(() => {
            resourcePromiseCache.delete(path);
        });

        resourcePromiseCache.set(path, resourcePromise);
        return resourcePromise;
    },
    put(pathname: string, query?: Query) {
        return this.http("put", makePath(pathname, query));
    },
    post(pathname: string, query?: Query) {
        return this.http("post", makePath(pathname, query));
    },

    // TODO use _.pick to lessen memory footprint
    getTrack(trackId: string, query?: Partial<MarketQuery>): Promise<Track> {
        return this.get(`/tracks/${trackId}`, query);
    },
    getAlbum(albumId: string, query?: Partial<MarketQuery>): Promise<Album> {
        return this.get(`/albums/${albumId}`, query);
    },
    getPlaylist(playlistId: string, query?: Partial<MarketQuery>): Promise<Playlist> {
        return this.get(`/playlists/${playlistId}`, query);
    },
    getArtist(artistId: string): Promise<Artist> {
        return this.get(`/artists/${artistId}`);
    },
    getArtistTopTracks(artistId: string, query: Partial<MarketQuery>): Promise<{ tracks: Track[]; }> {
        return this.get(`/artists/${artistId}/top-tracks`, query);
    },
    getUser(userId: string): Promise<User> {
        return this.get(`/users/${userId}`);
    },
    getSearch<TK extends SearchableResource["type"]>(query: string, types: TK[], opts?: Partial<MarketQuery & {
        limit: number;
        offset: number;
    }>): Promise<{
        [K in TK]: Pagination<ResourceMap[K]>;
    }> {
        return this.get("/search", {
            q: query,
            type: types.join(","),
            ...opts,
        });
    },

    // Player
    PlayerStore,
    usePlayer<T, K extends PlayerStoreStates, S = Pick<PlayerStore, K>>(keys: K[], compare?: (old: S, newer: S) => boolean) {
        return useStateFromStores(
            [PlayerStore],
            () => Object.fromEntries(keys.map(key => [key, PlayerStore[key]])) as S,
            null,
            compare,
        );
    },

    prev() {
        return this.post("/me/player/previous");
    },
    next() {
        return this.post("/me/player/next");
    },
    setVolume(percent: number) {
        return this.put("/me/player/volume", { volume_percent: Math.round(percent) });
    },
    setPlaying(playing: boolean) {
        return this.put(`/me/player${playing ? "/play" : "/pause"}`);
    },
    setRepeat(state: RepeatState) {
        return this.put("/me/player/repeat", { state });
    },
    setShuffle(state: boolean) {
        return this.put("/me/player/shuffle", { state });
    },
    seek(ms: number) {
        return Spotify.put("/me/player/seek", { position_ms: Math.round(ms) });
    },
    queue(track: Track | Track["id"]) {
        const trackId = typeof track === "string" ? track : track.id;
        return this.post("/me/player/queue", { uri: `spotify:track:${trackId}` });
    },
};

export const MARKET_CODES = "AD AE AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CG CH CI CL CM CO CR CV CW CY CZ DE DJ DK DM DO DZ EC EE EG ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IS IT JM JO JP KE KG KH KI KM KN KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RW SA SB SC SE SG SI SK SL SM SN SR ST SV SZ TD TG TH TJ TL TN TO TR TT TV TW TZ UA UG US UY UZ VC VE VN VU WS XK ZA ZM ZW".split(" ");

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
export function getMarketName(code: string) {
    return regionNames.of(code);
}

export function getImageClosestTo(resource: Resource, size: number) {
    let images: ResourceImage[] | null = null;
    if ("images" in resource) images = resource.images.slice();
    else if (resource.type === "track") images = resource.album.images.slice();

    if (!images) return null;

    images.sort((a, b) => Math.abs(size - a.width) - Math.abs(size - b.width));
    return images[0];
}
