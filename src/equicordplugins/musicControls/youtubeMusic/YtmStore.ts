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

export type RepeatMode = "NONE" | "ONE" | "ALL";


export interface Song {
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

enum DataTypes {
    PlayerInfo = "PLAYER_INFO",
    VideoChanged = "VIDEO_CHANGED",
    PlayerStateChanged = "PLAYER_STATE_CHANGED",
    PositionChanged = "POSITION_CHANGED",
    VolumeChanged = "VOLUME_CHANGED",
    RepeatChanged = "REPEAT_CHANGED",
    ShuffleChanged = "SHUFFLE_CHANGED",
}

type PlayerInfo = {
    type: DataTypes.PlayerInfo;
    song: Song | undefined;
    volume: number,
    muted: boolean;
    repeat: RepeatMode;
    position: number;
    isPlaying: boolean;
    shuffle: boolean;
};

type VideoChanged = {
    type: DataTypes.VideoChanged;
    song: Song;
    position: number;
};

type PlayerStateChanged = {
    type: DataTypes.PlayerStateChanged;
    isPlaying: boolean,
    position: number;
};

type PositionChanged = {
    type: DataTypes.PositionChanged,
    position: number;
};

type VolumeChanged = {
    type: DataTypes.VolumeChanged;
    volume: number;
    muted: boolean;
};

type RepeatChanged = {
    type: DataTypes.RepeatChanged;
    repeat: RepeatMode;
};

type ShuffleChanged = {
    type: DataTypes.ShuffleChanged;
    shuffle: boolean;
};

export type Repeat = "NONE" | "ONE" | "ALL";

export const logger = new Logger("MusicControls-Ytm");

type Message = PlayerInfo | VideoChanged | PlayerStateChanged | PositionChanged | VolumeChanged | RepeatChanged | ShuffleChanged;

type PlayerState = Partial<Omit<PlayerInfo, "type">>;

class YoutubemusicSocket {
    public onChange: (e: PlayerState) => void;
    private ready = false;
    private connecting = false;

    private socket: WebSocket | undefined;

    constructor(onChange: typeof this.onChange) {
        this.reconnect();
        this.onChange = onChange;
    }

    public scheduleReconnect(ms: number) {
        setTimeout(() => this.reconnect(), ms);
    }

    public reconnect() {
        if (this.ready || this.connecting) return;
        this.connecting = true;
        this.initWs();
    }

    private async initWs() {
        const url = Settings.plugins.MusicControls.YoutubeMusicApiUrl;
        if (!url) {
            this.connecting = false;
            return;
        }

        try {
            this.socket = new WebSocket(new URL("/api/v1/ws", url));
        } catch (e) {
            logger.error("Connection failed");
            return;
        }

        this.socket.addEventListener("open", () => {
            this.ready = true;
            this.connecting = false;
        });

        this.socket.addEventListener("error", e => {
            this.ready = false;
            this.connecting = false;
            if (!this.ready) this.scheduleReconnect(5_000);
            this.onChange({ position: 0, isPlaying: false, song: undefined });

        });

        this.socket.addEventListener("close", e => {
            this.ready = false;
            this.connecting = false;
            if (!this.ready) this.scheduleReconnect(10_000);
            this.onChange({ position: 0, isPlaying: false, song: undefined });
        });


        this.socket.addEventListener("message", e => {
            let message: Message;
            try {
                message = JSON.parse(e.data) as Message;
                this.onChange(message);
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
        public isShuffled = false;
        public repeat: Repeat = "NONE";
        public volume = 0;
        public muted = false;

        public isSettingPosition = false;

        public socket = new YoutubemusicSocket((message: PlayerState) => {
            if (message.song) {
                store.song = message.song;
                store.isPlaying = !(message.song?.isPaused ?? false);
            }
            if (message.isPlaying != null && !message.song) store.isPlaying = message.isPlaying;
            if (message.shuffle != null) store.isShuffled = message.shuffle;
            if (message.position && message.position !== store.position) store.position = message.position ?? 0;
            if (message.volume) store.volume = message.volume ?? 0;
            if (message.repeat) store.repeat = message.repeat;
            if (message.muted != null) store.muted = message.muted;

            store.isSettingPosition = false;
            store.emitChange();
        });

        public openExternal(path: string) {
            const videoId = path.match(/watch\?v=([\w-]+)/);

            const url = Vencord.Plugins.isPluginEnabled("OpenInApp") && videoId
                ? encodeURI("youtubemusic://openVideo " + videoId[1])
                : "https://music.youtube.com" + path;

            logger.info("Open", url);

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
            this.req("post", "/api/v1/previous");
        }
        next() {
            this.req("post", "/api/v1/next");
        }
        setVolume(percent: number) {
            this.req("post", "/api/v1/volume", {
                body: {
                    volume: Math.floor(percent)
                },
            });
        }
        setPlaying(playing: boolean) {
            if (playing) {
                this.req("post", "/api/v1/play");
            } else {
                this.req("post", "/api/v1/pause");
            }
        }
        switchRepeat() {
            this.req("post", "/api/v1/switch-repeat", {
                body: {
                    iteration: 1
                }
            });
        }
        shuffle() {
            this.req("post", "/api/v1/shuffle");
        }
        seek(ms: number) {
            this.req("post", "/api/v1/seek-to", {
                body: {
                    seconds: Math.floor(ms / 1000)
                }
            });
        }
        toggleMute() {
            this.req("post", "/api/v1/toggle-mute");
        }

        private req(method: "post" | "get" | "put", route: string, data: any = {}) {
            const apiServerUrl = Settings.plugins.MusicControls.YoutubeMusicApiUrl;
            if (apiServerUrl === "") return;
            const url = apiServerUrl + route;

            fetch(url, {
                method,
                ...data,
                ...(data.body && { body: JSON.stringify(data.body), headers: { "Content-Type": "application/json" } })
            });
        }
    }

    const store = new YoutubeMusicStore(FluxDispatcher);

    return store;
});
