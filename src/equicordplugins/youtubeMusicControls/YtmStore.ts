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

const logger = new Logger("YoutubeMusicControls");

type Message = { type: "PLAYER_STATE"; } & PlayerState;

class YoutubeMusicSocket {
    public onChange: (e: Message) => void;
    public ready = false;

    public socket: WebSocket | undefined;

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
            "previous": () => this.socket?.send(JSON.stringify({ type: "ACTION", action: "previous" })),
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
            this.ready = false;
            if (!this.ready) setTimeout(() => this.reconnect(), 10_000);

            this.onChange({ type: "PLAYER_STATE", song: null, isPlaying: false, position: 0, repeat: "NONE", volume: 0 });
        });


        this.socket.addEventListener("message", e => {
            let message: Message;
            try {
                message = JSON.parse(e.data) as Message;

                switch (message.type) {
                    case "PLAYER_STATE":
                        this.onChange(message);
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
        public start = 0;

        public song: Song | null = null;
        public isPlaying = false;
        public repeat: Repeat = "NONE";
        public shuffle = false;
        public volume = 0;

        public socket = new YoutubeMusicSocket((message: Message) => {
            if (message.song) {
                store.song = message.song;
                store.position = message.song.elapsedSeconds ?? 0;
            }
            if (message.isPlaying != null) store.isPlaying = message.isPlaying;
            if (message.position && message.position !== store.position) store.position = message.position ?? 0;
            if (message.volume) store.volume = message.volume ?? 0;
            if (message.repeat) store.repeat = message.repeat;

            store.emitChange();
        });

        public openExternal(path: string) {
            const videoId = path.match(/watch\?v=([\w-]+)/);

            const url = (Settings.plugins.YouTubeMusicControls.useYoutubeMusicUri || Vencord.Plugins.isPluginEnabled("OpenInApp")) && videoId
                ? encodeURI("youtubemusic://openVideo " + videoId[1])
                : "https://music.youtube.com" + path;

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

        previous() {
            if (!this.ensureSocketReady()) return;
            this.socket.routes.previous();
        }
        next() {
            if (!this.ensureSocketReady()) return;
            this.socket.routes.next();
        }
        setVolume(percent: number) {
            if (!this.ensureSocketReady()) return;
            this.socket.routes.setVolume(Math.round(percent));
            this.volume = percent;
            this.emitChange();
        }
        setPlaying(playing: boolean) {
            if (!this.ensureSocketReady()) return;
            this.socket.routes[playing ? "play" : "pause"]();
            this.isPlaying = playing;
        }
        setRepeat(state: Repeat) {
            if (!this.ensureSocketReady()) return;
            this.socket.routes.repeat(state);
            this.repeat = state;
            this.emitChange();
        }
        setShuffle(state: boolean) {
            if (!this.ensureSocketReady()) return;
            this.socket.routes.shuffle();
            this.shuffle = state;
            this.emitChange();
        }
        seek(ms: number) {
            if (!this.ensureSocketReady()) return;
            this.socket.routes.seek(Math.round(ms / 1000));
        }

        public ensureSocketReady(): boolean {
            if (!this.socket || !this.socket.ready) {
                return false;
            }
            return true;
        }
    }

    const store = new YoutubeMusicStore(FluxDispatcher);

    return store;
});
