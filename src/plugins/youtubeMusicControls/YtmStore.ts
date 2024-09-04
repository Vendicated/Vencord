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

class YoutubemusicSocket {
    private PORT = 26539;
    public onChange: (e: Message) => void;
    private ready = false;

    private socket: WebSocket | undefined;

    constructor(onChange: typeof this.onChange) {
        this.tryConnect();
        this.onChange = onChange;
    }

    private tryConnect() {
        if (this.ready) return;
        try {
            this.initWs();
        } catch (e) {
            logger.error("Failed to connect to YouTube Music WebSocket", e);
            return;
        }
        this.ready = true;
        // const connectInterval = setInterval(() => {
        //     if (this.ready) clearInterval(connectInterval);
        // }, 5_000);
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
            "repeat": () => this.socket?.send(JSON.stringify({ type: "ACTION", action: "repeat" })),
        };
    }

    private initWs() {
        this.socket = new WebSocket(`ws://localhost:${this.PORT}`);

        this.socket.addEventListener("open", () => {
            // logger.info("Connected to YouTube Music WebSocket");
            this.ready = true;
            this.routes.pause();
            this.routes.play();
        });

        this.socket.addEventListener("error", e => {
            // logger.error("YouTube Music Socket Error:", e);
            if (!this.ready) setTimeout(() => this.tryConnect(), 5_000);
            this.onChange({ type: "PLAYER_STATE", song: null, isPlaying: false, position: 0, repeat: "NONE", volume: 0 });

        });

        this.socket.addEventListener("close", e => {
            // logger.info("YouTube Music Socket Disconnected:", e.code, e.reason);
            this.ready = false;
            if (!this.ready) setTimeout(() => this.tryConnect(), 10_000);
            // this.tryConnect();

            this.onChange({ type: "PLAYER_STATE", song: null, isPlaying: false, position: 0, repeat: "NONE", volume: 0 });
        });


        this.socket.addEventListener("message", e => {
            let message: Message;
            try {
                message = JSON.parse(e.data) as Message;

                logger.info(message);

                switch (message.type) {
                    case "PLAYER_STATE":
                        this.onChange(message);
                        break;
                }
            } catch (err) {
                logger.error("Invalid JSON:", err, `\n${e.data}`);
                return;
            }

            logger.info("Received Message:", message.type, "\n", message);
        });
    }
}

export const YoutubeMusicStore = proxyLazyWebpack(() => {
    const { Store } = Flux;

    class YoutubeMusicStore extends Store {
        public mPosition = 0;
        public isSettingPosition = false;

        public song: Song | null = null;
        public isPlaying = false;
        public repeat: Repeat = "NONE";
        public volume = 0;

        public openExternal(path: string) {
            const isVideo = path.match(/watch\?v=(\w+)/);

            const url = (Settings.plugins.YouTubeMusicControls.useYoutubeMusicUri || Vencord.Plugins.isPluginEnabled("OpenInApp")) && isVideo
                ? `youtubemusic://opneVideo ${path.split("watch?v=")[1]}`
                : `https://music.youtube.com${path}`;

            path.match(/watch\?v=(\w+)/);

            // https://music.youtube.com/watch?v=BSHYPb15W-Y

            VencordNative.native.openExternal(url);
        }


        set position(p: number) {
            this.mPosition = p * 1000;
        }

        get position(): number {
            return this.mPosition;
        }

        prev() {
            socket.routes.prev();
        }
        next() {
            socket.routes.next();
        }
        setVolume(percent: number) {
            socket.routes.setVolume(percent);
        }
        setPlaying(playing: boolean) {
            if (playing) {
                // YoutubemusicAPI.routes.pause.actions.do();
                socket.routes.play();
            } else {
                // YoutubemusicAPI.routes.play.actions.do();
                socket.routes.pause();
            }
        }
        switchRepeat() {
            socket.routes.repeat();
        }
        shuffle() {
            socket.routes.shuffle();
        }
        seek(ms: number) {
            socket.routes.seek(ms / 1000);
        }
    }

    const store = new YoutubeMusicStore(FluxDispatcher);

    const socket = new YoutubemusicSocket((message: Message) => {
        store.song = message.song;
        store.isPlaying = message.isPlaying;
        store.position = message.position ?? 0;
        store.volume = message.volume ?? 0;
        store.repeat = message.repeat || "NONE";

        store.isSettingPosition = false;
        store.emitChange();
    });

    logger.info("Youtube Music Controls initialized");

    return store;
});
