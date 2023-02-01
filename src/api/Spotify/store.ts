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

import { proxyLazy } from "@utils/proxyLazy";
import { Flux, FluxDispatcher } from "@webpack/common";

import { Spotify } from ".";
import { PlayerState, PlayerTrack, RepeatState, SpotifyDevice } from "./types";

// Don't wanna run before Flux and Dispatcher are ready!
export type SpotifyPlayerStore = typeof SpotifyPlayerStore;
export const SpotifyPlayerStore = proxyLazy(() => {
    const { Store } = Flux;

    class SpotifyPlayerStore extends Store {
        private start = 0;

        mPosition = 0;
        isSettingPosition = false;
        track: PlayerTrack | null = null;
        device: SpotifyDevice | null = null;
        isPlaying = false;
        repeat: RepeatState = "off";
        shuffle = false;
        volume = 0;

        // Need to keep track of this manually
        get position(): number {
            return this.mPosition + (this.isPlaying ? Date.now() - this.start : 0);
        }

        set position(pos: number) {
            this.mPosition = pos;
            this.start = Date.now();
        }

        setVolume(percent: number) {
            Spotify.setVolume(percent).then(() => {
                this.volume = percent;
                this.emitChange();
            });
        }

        setShuffle(state: boolean) {
            Spotify.setShuffle(state).then(() => {
                this.shuffle = state;
                this.emitChange();
            });
        }

        seek(ms: number) {
            if (this.isSettingPosition) return Promise.resolve();

            this.isSettingPosition = true;

            return Spotify.seek(ms).catch((err: any) => {
                console.error("[VencordSpotifyAPI] Failed to seek", err);
                this.isSettingPosition = false;
            });
        }
    }

    const store = new SpotifyPlayerStore(FluxDispatcher, {
        SPOTIFY_PLAYER_STATE(player: PlayerState) {
            store.track = player.track;
            store.device = player.device ?? null;
            store.isPlaying = player.isPlaying ?? false;
            store.volume = player.volumePercent ?? 0;
            store.repeat = player.actualRepeat || "off";
            store.position = player.position ?? 0;
            // eslint-disable-next-line dot-notation
            store["isSettingPosition"] = false;
            store.emitChange();
        },
        SPOTIFY_SET_DEVICES({ devices }: { devices: SpotifyDevice[]; }) {
            store.device = devices.find(d => d.is_active) ?? devices[0] ?? null;
            store.emitChange();
        }
    });

    return store;
});
