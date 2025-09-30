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

import { Settings } from "@api/Settings";
import { findByProps, findByPropsLazy, proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";

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
    device?: Device;

    // added by patch
    actual_repeat: Repeat;
    shuffle: boolean;
}

interface Device {
    id: string;
    is_active: boolean;
}

type Repeat = "off" | "track" | "context";

// Don't wanna run before Flux and Dispatcher are ready!
export const SpotifyStore = proxyLazyWebpack(() => {
    // For some reason ts hates extends Flux.Store
    const { Store } = Flux;

    const SpotifySocket = findByProps("getActiveSocketAndDevice");
    const SpotifyAPI = findByPropsLazy("vcSpotifyMarker");

    const API_BASE = "https://api.spotify.com/v1/me/player";

    class SpotifyStore extends Store {
        public mPosition = 0;
        public _start = 0;

        public track: Track | null = null;
        public device: Device | null = null;
        public isPlaying = false;
        public repeat: Repeat = "off";
        public shuffle = false;
        public volume = 0;

        public isSettingPosition = false;

        public openExternal(path: string) {
            const url = Settings.plugins.SpotifyControls.useSpotifyUris || Vencord.Plugins.isPluginEnabled("OpenInApp")
                ? "spotify:" + path.replaceAll("/", (_, idx) => idx === 0 ? "" : ":")
                : "https://open.spotify.com" + path;

            VencordNative.native.openExternal(url);
        }

        // Need to keep track of this manually
        public get position(): number {
            let pos = this.mPosition;
            if (this.isPlaying) {
                pos += Date.now() - this._start;
            }
            return pos;
        }

        public set position(p: number) {
            this.mPosition = p;
            this._start = Date.now();
        }

        prev() {
            // optimistic: assume track will change, reset position locally
            this.mPosition = 0;
            this._start = Date.now();
            this.emitChange();

            this._req("post", "/previous").catch((e: any) => {
                console.error("[VencordSpotifyControls] Failed to previous", e);
                // rely on SPOTIFY_PLAYER_STATE to reconcile
            });
        }

        next() {
            // optimistic: assume track will change, reset position locally
            this.mPosition = 0;
            this._start = Date.now();
            this.emitChange();

            this._req("post", "/next").catch((e: any) => {
                console.error("[VencordSpotifyControls] Failed to next", e);
            });
        }

        setVolume(percent: number) {
            const prev = this.volume;
            // optimistic update
            this.volume = percent;
            this.emitChange();

            this._req("put", "/volume", {
                query: {
                    volume_percent: Math.round(percent)
                }
            }).catch((e: any) => {
                console.error("[VencordSpotifyControls] Failed to set volume", e);
                // revert on failure; SPOTIFY_PLAYER_STATE will also reconcile when available
                this.volume = prev;
                this.emitChange();
            });
        }

        setPlaying(playing: boolean) {
            const prev = this.isPlaying;
            // optimistic update
            this.isPlaying = playing;
            if (playing) this._start = Date.now();
            this.emitChange();

            this._req("put", playing ? "/play" : "/pause").catch((e: any) => {
                console.error("[VencordSpotifyControls] Failed to set playing", e);
                // revert on failure
                this.isPlaying = prev;
                this.emitChange();
            });
        }

        setRepeat(state: Repeat) {
            const prev = this.repeat;
            // optimistic update
            this.repeat = state;
            this.emitChange();

            this._req("put", "/repeat", {
                query: { state }
            }).catch((e: any) => {
                console.error("[VencordSpotifyControls] Failed to set repeat", e);
                this.repeat = prev;
                this.emitChange();
            });
        }

        setShuffle(state: boolean) {
            const prev = this.shuffle;
            // optimistic update
            this.shuffle = state;
            this.emitChange();

            this._req("put", "/shuffle", {
                query: { state }
            }).catch((e: any) => {
                console.error("[VencordSpotifyControls] Failed to set shuffle", e);
                this.shuffle = prev;
                this.emitChange();
            });
        }

        seek(ms: number) {
            if (this.isSettingPosition) return Promise.resolve();

            // optimistic: update local position immediately and mark as setting
            this.isSettingPosition = true;
            this.mPosition = Math.round(ms);
            this._start = Date.now();
            this.emitChange();

            return this._req("put", "/seek", {
                query: {
                    position_ms: Math.round(ms)
                }
            }).catch((e: any) => {
                console.error("[VencordSpotifyControls] Failed to seek", e);
                // clear flag on request failure; SPOTIFY_PLAYER_STATE will clear it on success
                this.isSettingPosition = false;
            });
        }

        _req(method: "post" | "get" | "put", route: string, data: any = {}) {
            if (this.device?.is_active)
                (data.query ??= {}).device_id = this.device.id;

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
            store.device = e.device ?? null;
            store.isPlaying = e.isPlaying ?? false;
            store.volume = e.volumePercent ?? 0;
            store.repeat = e.actual_repeat || "off";
            store.shuffle = e.shuffle ?? false;
            store.position = e.position ?? 0;
            store.isSettingPosition = false;
            store.emitChange();
        },
        SPOTIFY_SET_DEVICES({ devices }: { devices: Device[]; }) {
            store.device = devices.find(d => d.is_active) ?? devices[0] ?? null;
            store.emitChange();
        }
    });

    return store;
});
