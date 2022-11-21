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

import cssText from "~fileContent/spotifyStyles.css";

import { Settings } from "../../api/settings";
import { Flex } from "../../components/Flex";
import IpcEvents from "../../utils/IpcEvents";
import { lazyWebpack } from "../../utils/misc";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "../../utils/modal";
import { proxyLazy } from "../../utils/proxyLazy";
import { filters } from "../../webpack";
import { Button, Flux, FluxDispatcher, Text } from "../../webpack/common";

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
}

interface Device {
    id: string;
    is_active: boolean;
}

type Repeat = "off" | "track" | "context";

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

    const API_BASE = "https://api.spotify.com/v1/me";

    class SpotifyStore extends Store {
        constructor(dispatcher: any, handlers: any) {
            super(dispatcher, handlers);
        }

        public mPosition = 0;
        private start = 0;

        public track: Track | null = null;
        public savedTrackIds: Map<string, boolean> = new Map();
        public device: Device | null = null;
        public isPlaying = false;
        public repeat: Repeat = "off";
        public shuffle = false;
        public volume = 0;

        public isSettingPosition = false;
        public showInsufficientPermissionsModal = true;

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

        prev() {
            this.req("post", "/player/previous");
        }

        next() {
            this.req("post", "/player/next");
        }

        setVolume(percent: number) {
            this.req("put", "/player/volume", {
                query: {
                    volume_percent: Math.round(percent)
                }

            }).then(() => {
                this.volume = percent;
                this.emitChange();
            });
        }

        setPlaying(playing: boolean) {
            this.req("put", playing ? "/player/play" : "/player/pause");
        }

        setRepeat(state: Repeat) {
            this.req("put", "/player/repeat", {
                query: { state }
            });
        }

        setShuffle(state: boolean) {
            this.req("put", "/player/shuffle", {
                query: { state }
            }).then(() => {
                this.shuffle = state;
                this.emitChange();
            });
        }

        checkSaved() {
            if (Settings.plugins.SpotifyControls.manageSavedSongs === true && SpotifySocket.getActiveSocketAndDevice() && this.track?.id) {
                const { track } = this;

                if (!this.savedTrackIds.has(track.id)) {
                    this.req("get", "/tracks/contains", {
                        query: {
                            ids: this.track.id
                        }
                    }).then((res: any) => {
                        console.log("SPOTIFY IS SAVED", res);
                        if (res && res.body && Array.isArray(res.body)) {
                            this.savedTrackIds.set(track.id, res.body[0]);
                            this.emitChange();
                        }
                    });
                }
            }
        }

        saveTrack() {
            if (this.track?.id) {
                const { track } = this;
                if (this.savedTrackIds.has(track.id)) {
                    const current = this.savedTrackIds.get(track.id);
                    this.req(current ? "delete" : "put", "/tracks", {
                        query: {
                            ids: this.track.id
                        }
                    }).then((res: any) => {
                        console.log("SPOTIFY SAVED", res);
                        if (res.ok) {
                            this.savedTrackIds.set(track.id, !current);
                            this.emitChange();
                        }
                    });
                } else {
                    // should never happen as the indicator is only displayed if the track is in the map
                    console.warn("[SpotifyControls] Tried to save track that wasn't checked yet");
                }
            }
        }

        seek(ms: number) {
            if (this.isSettingPosition) return Promise.resolve();

            this.isSettingPosition = true;

            return this.req("put", "/player/seek", {
                query: {
                    position_ms: Math.round(ms)
                }
            }).catch((e: any) => {
                console.error("[VencordSpotifyControls] Failed to seek", e);
                this.isSettingPosition = false;
            });
        }

        private req(method: "post" | "get" | "put" | "delete", route: string, data: any = {}) {
            if (this.device?.is_active && route.includes("/player"))
                (data.query ??= {}).device_id = this.device.id;

            const { socket } = SpotifySocket.getActiveSocketAndDevice();
            const spotifyPromise = SpotifyAPI[method](socket.accountId, socket.accessToken, {
                url: API_BASE + route,
                ...data
            });
            if (Settings.plugins.SpotifyControls.manageSavedSongs === true && spotifyPromise.catch) {
                spotifyPromise.catch((e: any) => {
                    // insufficient client scope
                    if (this.showInsufficientPermissionsModal && e?.body?.error?.status === 403) {
                        openModal(modalProps => (
                            <ModalRoot size={ModalSize.SMALL} {...modalProps}>
                                <ModalHeader>
                                    <Flex>
                                        <Text variant="heading-md/bold">Reconnect Spotify</Text>
                                    </Flex>
                                </ModalHeader>
                                <ModalContent style={{ marginBottom: 10, marginTop: 10, marginRight: 8, marginLeft: 8 }}>
                                    <Text variant="text-md/normal">You need to re-authenticate your Spotify account with Discord!</Text>
                                    <Text variant="text-sm/normal">This is required for it to be able to read and modify your liked songs.</Text>
                                    <Text variant="text-sm/normal" style={{ marginTop: 8 }}>Go to Settings - Connections - Spotify</Text>
                                </ModalContent>
                                <ModalFooter>
                                    <Flex>
                                        <Button
                                            onClick={modalProps.onClose}
                                            size={Button.Sizes.SMALL}
                                            color={Button.Colors.PRIMARY}
                                        >
                                            OK
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                this.showInsufficientPermissionsModal = false;
                                                modalProps.onClose();
                                            }}
                                            size={Button.Sizes.SMALL}
                                            color={Button.Colors.PRIMARY}
                                        >
                                            OK, don't show again
                                        </Button>
                                    </Flex>
                                </ModalFooter>
                            </ModalRoot>
                        ));
                    }
                });
            }
            return spotifyPromise;
        }
    }

    const store = new SpotifyStore(FluxDispatcher, {
        SPOTIFY_PLAYER_STATE(e: PlayerState) {
            store.track = e.track;
            store.device = e.device ?? null;
            store.isPlaying = e.isPlaying ?? false;
            store.volume = e.volumePercent ?? 0;
            store.repeat = e.actual_repeat || "off";
            store.position = e.position ?? 0;
            store.isSettingPosition = false;
            store.emitChange();
            store.checkSaved(); // TODO: this is not a good spot as SpotifySocket.getActiveSocketAndDevice() might not be ready yet
        },
        SPOTIFY_SET_DEVICES({ devices }: { devices: Device[]; }) {
            store.device = devices.find(d => d.is_active) ?? devices[0] ?? null;
            store.emitChange();
        }
    });

    return store;
});
