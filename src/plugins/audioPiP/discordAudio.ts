/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Message, MessageAttachment } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { FluxDispatcher, useEffect, useLayoutEffect, useRef } from "@webpack/common";
import type { RefObject } from "react";

import { readSnapshot as snapshotOf } from "./media";
import { logger, type PlaybackSnapshot } from "./player";

export type NativeAudioKind = "audio" | "voice";
export type NativeAttachment = MessageAttachment & { duration_secs?: number; };

interface NativeProps {
    message?: Message;
    item?: { originalItem?: NativeAttachment; };
    src?: string;
    playbackCacheKey?: string;
    onVolumeChange?(amplitude: number): void;
    onMute?(muted: boolean): void;
}

export interface NativeAudio {
    readonly kind: NativeAudioKind;
    readonly element: HTMLAudioElement;
    readonly message: Message;
    readonly attachment: NativeAttachment;
    readonly src: string;
    readonly playbackCacheKey: string | undefined;
    readSnapshot(): DetachSnapshot;
    applySnapshot(snapshot: PlaybackSnapshot): void;
    seek(time: number): void;
    setVolume(amplitude: number): void;
    setMuted(muted: boolean): void;
    setPlaybackRate(rate: number): void;
    pause(): void;
    // playing confirms success; onRefused only reports a rejected attempt
    play(onRefused?: (error: unknown) => void): void;
}

export interface DetachSnapshot extends PlaybackSnapshot {
    paused: boolean;
    ended: boolean;
}

export interface NativeAudioListener {
    attach?(audio: NativeAudio): void;
    play?(audio: NativeAudio): void;
    detach?(audio: NativeAudio, snapshot: DetachSnapshot): void;
}

const mounted = new Map<HTMLAudioElement, NativeAudio>();
const listeners = new Set<NativeAudioListener>();

function emit<K extends keyof NativeAudioListener>(event: K, ...args: Parameters<NonNullable<NativeAudioListener[K]>>) {
    for (const listener of listeners) {
        try {
            (listener[event] as ((...a: typeof args) => void) | undefined)?.(...args);
        } catch (err) {
            logger.error(`Native audio ${event} listener failed`, err);
        }
    }
}

export function subscribeNativeAudio(listener: NativeAudioListener) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
}

export const getNativeAudios = () => Array.from(mounted.values());

// ref and effect callbacks run in Discord's React commit, where a throw reaches its error boundary
function safely(action: string, fn: () => void) {
    try {
        fn();
    } catch (err) {
        logger.error(`Failed to ${action} native audio`, err);
    }
}

type Controls = Pick<NativeAudio, "pause" | "seek" | "setVolume" | "setMuted" | "setPlaybackRate"> & {
    // issued runs once Discord has accepted the play request
    play(issued: () => void): void;
};

function playbackKey(props: NativeProps) {
    const attachment = props.item?.originalItem;
    if (!props.message?.id || !props.message.channel_id || !attachment?.id) return;
    return JSON.stringify([props.message.channel_id, props.message.id, attachment.id, props.src ?? attachment.url, props.playbackCacheKey]);
}

function attach(kind: NativeAudioKind, element: HTMLAudioElement, props: NativeProps, controls: Controls) {
    if (!playbackKey(props)) return null;
    const src = props.src ?? props.item!.originalItem!.url;

    let last = snapshotOf(element);
    let pendingTime: number | undefined;
    // an older play attempt must not undo a newer play/pause command
    let request = 0;
    // a new url can still be using the old buffer
    let bufferedSrc: string | undefined;
    try {
        if (new URL(element.currentSrc).pathname === new URL(src).pathname)
            bufferedSrc = element.currentSrc;
    } catch { /* not loaded yet */ }
    const isCurrent = () => mounted.get(element) === audio;
    const readSnapshot = () => {
        if (isCurrent() && element.readyState > 0 && (!element.currentSrc || element.currentSrc === src || element.currentSrc === bufferedSrc))
            last = snapshotOf(element);
        return { ...last };
    };

    const audio: NativeAudio = {
        kind, element, src,
        message: props.message!,
        attachment: props.item!.originalItem!,
        playbackCacheKey: props.playbackCacheKey,
        readSnapshot,
        applySnapshot(snapshot) {
            if (!isCurrent()) return;
            this.seek(snapshot.currentTime);
            this.setPlaybackRate(snapshot.playbackRate);
            element.preservesPitch = snapshot.preservesPitch;
            this.setVolume(snapshot.volume);
            this.setMuted(snapshot.muted);
            last = { ...last, ...snapshot };
        },
        seek(time) {
            if (!isCurrent() || !Number.isFinite(time)) return;
            time = Math.max(0, time);
            if (Number.isFinite(element.duration) && element.duration > 0) time = Math.min(time, element.duration);
            pendingTime = element.readyState === 0 ? time : undefined;
            element.currentTime = time;
            controls.seek(time);
            last = { ...last, currentTime: time };
        },
        setVolume(amplitude) {
            if (!isCurrent() || !Number.isFinite(amplitude)) return;
            amplitude = Math.min(1, Math.max(0, amplitude));
            element.volume = amplitude;
            controls.setVolume(amplitude);
            last = { ...last, volume: amplitude };
        },
        setMuted(muted) {
            if (!isCurrent()) return;
            element.muted = muted;
            controls.setMuted(muted);
            last = { ...last, muted };
        },
        setPlaybackRate(rate) {
            if (!isCurrent() || !Number.isFinite(rate) || rate <= 0) return;
            element.playbackRate = rate;
            controls.setPlaybackRate(rate);
            last = { ...last, playbackRate: rate };
        },
        pause() {
            if (!isCurrent()) return;
            request++;
            controls.pause();
        },
        play(onRefused) {
            if (!isCurrent()) return;
            const id = ++request;
            const latest = () => id === request && isCurrent();
            // Discord's players drop the media promise, so play the same element to see a refusal
            controls.play(() => {
                if (!latest() || !element.paused) return;
                element.play().catch(err => {
                    if (err?.name === "AbortError" || !latest() || !(element.paused || element.error)) return;
                    controls.pause();
                    if (onRefused) onRefused(err);
                    else logger.error("Failed to play native audio", err);
                });
            });
        }
    };

    const onChange = () => { readSnapshot(); };
    const onPlay = () => {
        last = { ...last, paused: false, ended: false };
        onChange();
        emit("play", audio);
    };
    const onPause = () => {
        if (element.readyState > 0 || element.currentSrc === src)
            last = { ...last, paused: true, ended: element.ended };
        onChange();
    };
    const onMetadata = () => {
        if (pendingTime != null) audio.seek(pendingTime);
        onChange();
    };
    const events = new AbortController();
    const { signal } = events;
    for (const event of ["timeupdate", "seeking", "durationchange", "ratechange", "volumechange", "ended"] as const)
        element.addEventListener(event, onChange, { signal });
    element.addEventListener("play", onPlay, { signal });
    element.addEventListener("pause", onPause, { signal });
    element.addEventListener("loadedmetadata", onMetadata, { signal });
    mounted.set(element, audio);
    emit("attach", audio);

    return () => {
        const snapshot = readSnapshot();
        events.abort();
        if (isCurrent()) mounted.delete(element);
        emit("detach", audio, snapshot);
    };
}

interface MediaPlayerInstance {
    mediaRef: RefObject<HTMLMediaElement | null>;
    state: { playing: boolean; };
    play(): void;
    setPlay(playing: boolean): void;
    setTime(time: number): void;
    updateTime(time: number, duration: number): void;
    setState(state: Partial<{ volume: number; muted: boolean; playbackRate: number; hasClickedPlay: boolean; playing: boolean; }>, callback?: () => void): void;
}

const playerRefs = new WeakMap<object, {
    key: string | undefined;
    ref: (player: MediaPlayerInstance | null) => void;
}>();

export function nativeAudioPlayerRef(owner: { props: NativeProps; }) {
    const { props } = owner;
    const key = playbackKey(props);
    const previous = playerRefs.get(owner);
    if (previous && previous.key === key) return previous.ref;

    let detach: (() => void) | null = null;
    const ref = (player: MediaPlayerInstance | null) => safely("bind", () => {
        const unbind = detach;
        detach = null;
        unbind?.();
        const element = player?.mediaRef.current;
        if (!(element instanceof HTMLAudioElement) || !player) return;
        detach = attach("audio", element, props, {
            pause: () => player.setPlay(false),
            play: issued => {
                const { muted } = element;
                // discord unmutes audio files on play
                const afterPlay = () => {
                    element.muted = muted;
                    player.setState({ muted });
                    if (player.state.playing) issued();
                };
                if (player.state.playing) {
                    player.play();
                    afterPlay();
                } else {
                    player.setState({ playing: true, hasClickedPlay: true }, afterPlay);
                }
            },
            seek: time => {
                player.setTime(time);
                player.updateTime(time, Number.isFinite(element.duration) ? element.duration : props.item?.originalItem?.duration_secs ?? 0);
            },
            setVolume: volume => player.setState({ volume }),
            setMuted: muted => player.setState({ muted }),
            setPlaybackRate: playbackRate => player.setState({ playbackRate })
        });
    });
    playerRefs.set(owner, { key, ref });
    return ref;
}

interface VoiceControls {
    setPlaying(playing: boolean): void;
    setPlayed(played: boolean): void;
    seek(time: number): void;
    setMuted(muted: boolean): void;
    setVolume(amplitude: number): void;
}

export function useNativeVoiceAudio(props: NativeProps, audioRef: RefObject<HTMLAudioElement | null>, controls: VoiceControls) {
    const latest = useRef({ props, controls });
    latest.current = { props, controls };
    const bound = useRef<(() => void) | null>(null);
    const deps = [audioRef, playbackKey(props)];

    useLayoutEffect(() => () => safely("unbind", () => {
        const unbind = bound.current;
        bound.current = null;
        unbind?.();
    }), []);

    // let discord restore its cached position first
    useEffect(() => safely("bind", () => {
        const unbind = bound.current;
        bound.current = null;
        unbind?.();
        const element = audioRef.current;
        if (!(element instanceof HTMLAudioElement)) return;
        bound.current = attach("voice", element, props, {
            pause: () => latest.current.controls.setPlaying(false),
            play: issued => {
                latest.current.controls.setPlayed(true);
                latest.current.controls.setPlaying(true);
                issued();
            },
            seek: time => latest.current.controls.seek(time),
            setVolume: amplitude => {
                latest.current.controls.setVolume(amplitude);
                latest.current.props.onVolumeChange?.(amplitude);
            },
            setMuted: muted => {
                latest.current.controls.setMuted(muted);
                latest.current.props.onMute?.(muted);
            },
            setPlaybackRate: setVoicePlaybackRate
        });
    }), deps);
}

interface MediaPlaybackStore {
    getPlaybackRate(type: "voice_message"): number;
}

const MediaPlaybackStore = findStoreLazy("MediaPlaybackStore") as MediaPlaybackStore;

function setVoicePlaybackRate(rate: number) {
    if (MediaPlaybackStore.getPlaybackRate("voice_message") !== rate)
        FluxDispatcher.dispatch({ type: "MEDIA_PLAYBACK_RATE_UPDATE", rate, playbackType: "voice_message" });
}

export function storeVoicePosition(cacheKey: string, position: number, duration: number) {
    if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return;
    FluxDispatcher.dispatch({ type: "MEDIA_PLAYBACK_POSITION_UPDATE", cacheKey, position, duration });
}

export const nativeAudioPatches = [
    {
        find: "#{intl::VOICE_MESSAGES_PLAYBACK_RATE_LABEL}",
        replacement: [
            {
                match: /(?<=PureComponent\{render\(\)\{let\{[^}]+\}=this\.props;return\(0,\i\.jsx\)\(\i\.\i,)\{(?=src:\i,fileName:\i,fileSize:\(0,\i\.\i\)\(\i\),fileSizeBytes:\i,type:\i\.\i\.Types\.AUDIO,)/,
                replace: "{ref:$self.nativeAudioPlayerRef(this),"
            },
            {
                // props, audio ref, the play toggle's [playing, setPlaying] (the played effect confirms which state), setPlayed,
                // setMuted, setVolume, cached position, seek. the hook goes after Discord restores the cached position
                match: /playbackCacheKey:\i\}=(\i),(\i)=\i\.useRef\(null\).{0,400}?\[(\i),(\i)\]=\i\.useState\(!1\).{0,300}?\i\.useCallback\(\(\)=>\{\4\(\i=>!\i\),(\i)\(!0\)\},\[\]\).{0,1000}?(\i)\(0===\i\),(\i)\(\i\),.{0,500}?\i\.useEffect\(\(\)=>\{!\i&&\3&&\i\(!0\)\},\[\3,\i\]\).{0,250}?\i\.useEffect\(\(\)=>\{(\i)>0&&(\i)\(\8\)\},\[\8,\9\]\)/,
                replace: "$&,$self.useNativeVoiceAudio($1,$2,{setPlaying:$4,setPlayed:$5,seek:$9,setMuted:$6,setVolume:$7})"
            }
        ]
    }
];
