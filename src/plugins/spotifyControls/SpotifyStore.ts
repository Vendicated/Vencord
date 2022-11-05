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

import cssText from "~fileContent/styles.css";

import { IpcEvents, lazyWebpack, proxyLazy } from "../../utils";
import { filters } from "../../webpack";
import { Flux, FluxDispatcher } from "../../webpack/common";

export interface Track {
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

interface PlayerState {
    accountId: string;
    track: Track | null;
    volumePercent: number,
    isPlaying: boolean,
    repeat: boolean,
    position: number,
    context?: any;
    device?: any;
}

// Don't wanna run before Flux and Dispatcher are ready!
export const SpotifyStore = proxyLazy(() => {
    // TODO: Move this elsewhere
    const style = document.createElement("style");
    style.innerText = cssText;
    document.head.appendChild(style);

    // For some reason ts hates extends Flux.Store
    const { Store } = Flux;

    const SpotifySocket = lazyWebpack(filters.byProps("getActiveSocketAndDevice"));
    const SpotifyAPI = lazyWebpack(filters.byProps("SpotifyAPIMarker"));

    const API_BASE = "https://api.spotify.com/v1/me/player";

    class SpotifyStore extends Store {
        private mPosition = 0;
        private start = 0;

        public track: Track | null = null;
        public device: any = null;
        public isPlaying = false;
        public repeat = false;
        public volume = 0;

        public openExternal(path: string) {
            VencordNative.ipc.invoke(IpcEvents.OPEN_EXTERNAL, "https://open.spotify.com" + path);
        }

        // Need to keep track of this manually
        public get position(): number {
            let pos = this.mPosition;
            if (this.isPlaying) {
                pos += Date.now() - this.start;
            }
            return pos;
        }

        public set position(p: number) {
            this.mPosition = p;
            this.start = Date.now();
        }

        constructor(dispatcher: any, handlers: any) {
            super(dispatcher, handlers);
        }

        prev() {
            this.req("post", "/previous");
        }

        next() {
            this.req("post", "/next");
        }

        setVolume(volume_percent: number) {
            this.req("put", "/volume", {
                query: { volume_percent }
            }).then(() => {
                this.volume = volume_percent;
                this.emitChange();
            });
        }

        setPlaying(playing: boolean) {
            this.req("put", playing ? "/play" : "/pause");
        }

        seek(position_ms: number) {
            this.req("put", "/seek", {
                query: { position_ms }
            });
        }

        private req(method: "post" | "get" | "put", route: string, data: any = {}) {
            const { socket } = SpotifySocket.getActiveSocketAndDevice();
            return SpotifyAPI[method](socket.accountId, socket.accessToken, {
                url: API_BASE + route,
                ...data
            });
        }
    }

    const store = new SpotifyStore(FluxDispatcher, {
        SPOTIFY_PLAYER_STATE(e: PlayerState) {
            store.track = e.track;
            store.isPlaying = e.isPlaying ?? false;
            store.repeat = e.repeat ?? false;
            store.volume = e.volumePercent ?? 0;
            store.position = e.position ?? 0;
            store.emitChange();
        }
    });

    return store;
});
