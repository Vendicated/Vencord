/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";
import { Settings } from "Vencord";

enum MediaType {
    /**
     * Audio uploaded by the original artist
     */
    Audio = "AUDIO",
    /**
     * Official music video uploaded by the original artist
     */
    OriginalMusicVideo = "ORIGINAL_MUSIC_VIDEO",
    /**
     * Normal YouTube video uploaded by a user
     */
    UserGeneratedContent = "USER_GENERATED_CONTENT",
    /**
     * Podcast episode
     */
    PodcastEpisode = "PODCAST_EPISODE",
    OtherVideo = "OTHER_VIDEO",
}

interface Song {
    title: string;
    artist: string;
    views: number;
    uploadDate?: string;
    imageSrc?: string | null;
    isPaused?: boolean;
    songDuration: number;
    elapsedSeconds?: number;
    url?: string;
    album?: string | null;
    videoId: string;
    playlistId?: string;
    mediaType: MediaType;
}

export interface PlayerState {
    song: Song | null;
    isPlaying: boolean,
    position: number,
    repeat: Repeat,
    volume: number,
}

export type Repeat = "NONE" | "ONE" | "ALL";

const nextRepeat = (repeat: Repeat) => {
    switch (repeat) {
        case 'NONE':
            return 'ALL' as const;
        case 'ALL':
            return 'ONE' as const;
        case 'ONE':
            return 'NONE' as const;
    }
};

const logger = new Logger("YoutubeMusicControls");

type Message = { type: "PLAYER_STATE"; } & PlayerState;

class YoutubemusicSocket {
    private PORT = 26539;
    public onChange: (e: Message) => void;
    private ready = false;

    private socket: WebSocket | undefined;

    constructor(onChange: typeof this.onChange) {
        this.reconnect();
        this.onChange = onChange;
    }

    public reconnect() {
        if (this.ready) return;
        try {
            this.initWs();
        } catch (e) {
            logger.error("Failed to connect to YouTube Music WebSocket", e);
            return;
        }
        this.ready = true;
    }

    get routes() {
        return {
            "play": () => this.socket?.send(JSON.stringify({ type: "ACTION", action: "play" })),
            "pause": () => this.socket?.send(JSON.stringify({ type: "ACTION", action: "pause" })),
            "prev": () => this.socket?.send(JSON.stringify({ type: "ACTION", action: "prev" })),
            "next": () => this.socket?.send(JSON.stringify({ type: "ACTION", action: "next" })),
            "seek": (seconds: number) => this.socket?.send(JSON.stringify({ type: "ACTION", action: "seek", data: seconds })),
            "shuffle": () => this.socket?.send(JSON.stringify({ type: "ACTION", action: "shuffle" })),
            "setVolume": (percent: number) => this.socket?.send(JSON.stringify({ type: "ACTION", action: "setVolume", data: percent })),
            "getVolume": () => this.socket?.send(JSON.stringify({ type: "ACTION", action: "getVolume" })),
            "repeat": (repeat: Repeat) => this.socket?.send(JSON.stringify({ type: "ACTION", action: "repeat", data: repeat })),
        };
    }

    private initWs() {
        const url = Settings.plugins.YouTubeMusicControls.websocketUrl;
        if (!url) {
            return;
        }
        this.socket = new WebSocket(url);

        this.socket.addEventListener("open", () => {
            // logger.info("Connected to YouTube Music WebSocket");
            this.ready = true;
            this.routes.pause();
            this.routes.play();
        });

        this.socket.addEventListener("error", e => {
            // logger.error("YouTube Music Socket Error:", e);
            if (!this.ready) setTimeout(() => this.reconnect(), 5_000);
            this.onChange({ type: "PLAYER_STATE", song: null, isPlaying: false, position: 0, repeat: "NONE", volume: 0 });

        });

        this.socket.addEventListener("close", e => {
            // logger.info("YouTube Music Socket Disconnected:", e.code, e.reason);
            this.ready = false;
            if (!this.ready) setTimeout(() => this.reconnect(), 10_000);
            // this.tryConnect();

            this.onChange({ type: "PLAYER_STATE", song: null, isPlaying: false, position: 0, repeat: "NONE", volume: 0 });
        });


        this.socket.addEventListener("message", e => {
            let message: Message;
            try {
                message = JSON.parse(e.data) as Message;

                switch (message.type) {
                    case "PLAYER_STATE":
                        this.onChange(message);
                        console.log(message);
                        break;
                }
            } catch (err) {
                logger.error("Invalid JSON:", err, `\n${e.data}`);
                return;
            }
        });
    }
}

export const YoutubeMusicStore = proxyLazyWebpack(() => {
    const { Store } = Flux;

    class YoutubeMusicStore extends Store {
        public mPosition = 0;
        private start = 0;

        public song: Song | null = null;
        public isPlaying = false;
        public repeat: Repeat = "NONE";
        public volume = 0;

        public isSettingPosition = false;

        public socket = new YoutubemusicSocket((message: Message) => {
            if (message.song) {
                store.song = message.song;
                store.position = message.song.elapsedSeconds ?? 0;
            };
            if (message.isPlaying != null) store.isPlaying = message.isPlaying;
            if (message.position && message.position !== store.position) store.position = message.position ?? 0;
            if (message.volume) store.volume = message.volume ?? 0;
            if (message.repeat) store.repeat = message.repeat;

            store.isSettingPosition = false;
            store.emitChange();
        });

        public openExternal(path: string) {
            const videoId = path.match(/watch\?v=([\w-]+)/);

            const url = (Settings.plugins.YouTubeMusicControls.useYoutubeMusicUri || Vencord.Plugins.isPluginEnabled("OpenInApp")) && videoId
                ? encodeURI("youtubemusic://openVideo " + videoId[1])
                : "https://music.youtube.com" + path;

            console.log("Open", url);

            // https://music.youtube.com/watch?v=BSHYPb15W-Y
            VencordNative.native.openExternal(url);
        }


        set position(p: number) {
            this.mPosition = p * 1000;
            this.start = Date.now();
        }

        get position(): number {
            let pos = this.mPosition;
            if (this.isPlaying) {
                pos += Date.now() - this.start;
            }
            return pos;
        }

        prev() {
            // this.socket.routes.prev();
            this.req("post", "/api/v1/previous");
        }
        next() {
            // this.socket.routes.next();
            this.req("post", "/api/v1/next");
        }
        setVolume(percent: number) {
            // this.socket.routes.setVolume(percent);
            console.log(Math.floor(percent));
            this.req("post", "/api/v1/volume", {
                headers: {
                    "Content-Type": "application/json"
                },
                body: {
                    volume: Math.floor(percent)
                },
            });
        }
        setPlaying(playing: boolean) {
            if (playing) {
                // YoutubemusicAPI.routes.pause.actions.do();
                this.req("post", "/api/v1/play");
                // this.socket.routes.play();
            } else {
                // YoutubemusicAPI.routes.play.actions.do();
                this.req("post", "/api/v1/pause");
                // this.socket.routes.pause();
            }
        }
        switchRepeat() {
            // this.socket.routes.repeat(nextRepeat(this.repeat));
            this.req("post", "/api/v1/switch-repeat", {
                headers: {
                    "Content-Type": "application/json"
                },
                body: {
                    iteration: 1
                }
            });
        }
        shuffle() {
            // this.socket.routes.shuffle();
            this.req("post", "/api/v1/shuffle");
        }
        seek(ms: number) {
            // this.socket.routes.seek(ms / 1000);
            this.req("post", "/api/v1/seek-to", {
                headers: {
                    "Content-Type": "application/json"
                },
                body: {
                    seconds: Math.floor(ms / 1000)
                }
            });
        }

        private req(method: "post" | "get" | "put", route: string, data: any = {}) {
            const apiServerUrl = Settings.plugins.YouTubeMusicControls.apiServerUrl;
            if (apiServerUrl === "") return;
            console.log(fetch(apiServerUrl + route, {
                method,
                ...data,
                ...(data.body && { body: JSON.stringify(data.body) })
            }));
        }
    }

    const store = new YoutubeMusicStore(FluxDispatcher);

    logger.info("Youtube Music Controls initialized");

    return store;
});

function restartSocket() {
    YoutubeMusicStore.socket.reconnect();
}