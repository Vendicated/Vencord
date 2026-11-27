/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { filters, mapMangledModuleLazy } from "@webpack";

import type { DetachSnapshot, NativeAudio } from "./discordAudio";
import { hasSource, isAtEnd, readSnapshot } from "./media";

export const logger = new Logger("AudioPiP");

export interface TrackInfo {
    src: string;
    title: string;
    author: string;
    channelId: string;
    messageId: string;
    attachmentId: string;
    playbackCacheKey?: string;
    fallbackDuration: number;
}

export interface PlayerState {
    track: TrackInfo | null;
    isDetached: boolean;
    // Includes a play request while buffering.
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    muted: boolean;
    error: string | null;
    isBuffering: boolean;
}

export type PlaybackSnapshot = Pick<HTMLMediaElement, "currentTime" | "playbackRate" | "preservesPitch" | "volume" | "muted">;

const listeners = new Set<() => void>();
let state: PlayerState = {
    track: null,
    isDetached: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    error: null,
    isBuffering: false
};

function setState(patch: Partial<PlayerState>) {
    state = { ...state, ...patch };
    listeners.forEach(l => l());
}

export const playerStore = {
    getState: () => state,
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => void listeners.delete(listener);
    }
};

const Volume = mapMangledModuleLazy(["Math.pow(", "2.8", "Math.log10("], {
    toAmplitude: filters.byCode(/Math\.pow\(\i,2\.8\)/),
    toPerceptual: filters.byCode("Math.log10(")
}) as Record<"toAmplitude" | "toPerceptual", (volume: number, max: number) => number>;
const MediaPlayerPreferences = mapMangledModuleLazy("MediaPlayerVolume", {
    setVolume: filters.byCode(/volume:\i,muted:\i\(\)/),
    setMuted: filters.byCode(/volume:\i\(\),muted:\i/)
}) as {
    setVolume(volume: number): void;
    setMuted(muted: boolean): void;
};

const clampVolume = (volume: number) => Number.isFinite(volume) ? Math.min(Math.max(volume, 0), 1) : 1;
const fromElementVolume = (volume: number) => Volume.toPerceptual(volume, 1);

let detached: HTMLAudioElement | null = null;
let detachedSnapshot: DetachSnapshot | null = null;
let audio: HTMLAudioElement | null = null;
let native: NativeAudio | null = null;
let mediaEvents: AbortController | null = null;
let pending: { next: NativeAudio; events: AbortController; started: boolean; } | null = null;
let generation = 0;
let volumeBeforeMute = 1;

export function sameTrack(a: TrackInfo, b: TrackInfo) {
    return a.channelId === b.channelId && a.messageId === b.messageId && a.attachmentId === b.attachmentId;
}

function durationOf(el: HTMLAudioElement, track = state.track) {
    return Number.isFinite(el.duration) && el.duration > 0 ? el.duration : track?.fallbackDuration ?? 0;
}

function readCurrentSnapshot() {
    const current = readSnapshot(audio!);
    const from = audio === detached && detachedSnapshot && (audio!.readyState === 0 || audio!.error)
        ? { ...detachedSnapshot, paused: true, ended: current.ended }
        : current;
    return from;
}

function refresh() {
    if (!audio || !state.track) return;
    try {
        if (audio === detached && audio.readyState > 0 && !audio.error) detachedSnapshot = readSnapshot(audio);
        const from = readCurrentSnapshot();
        const duration = durationOf(audio) || state.duration;
        setState({
            currentTime: audio.ended ? duration : from.currentTime,
            duration,
            isPlaying: !audio.error && !audio.ended && (!!pending?.started || !audio.paused),
            volume: fromElementVolume(from.volume),
            muted: from.muted
        });
    } catch (err) {
        logger.error("Failed to read audio state", err);
    }
}

function watch(el: HTMLAudioElement | null, owner: NativeAudio | null) {
    generation++;
    mediaEvents?.abort();
    native = owner;
    audio = el;
    mediaEvents = el ? new AbortController() : null;
    if (!el) return;

    for (const event of ["play", "pause", "timeupdate", "durationchange", "loadedmetadata", "volumechange", "ratechange", "ended"] as const)
        el.addEventListener(event, refresh, { signal: mediaEvents!.signal });

    el.addEventListener("playing", () => {
        if (el.paused || el.error || pending?.started) return;
        setState({ isBuffering: false });
        refresh();
    }, { signal: mediaEvents!.signal });
    for (const event of ["waiting", "loadstart"])
        el.addEventListener(event, () => {
            if (!el.paused) setState({ isBuffering: true });
        }, { signal: mediaEvents!.signal });
    for (const event of ["pause", "ended"])
        el.addEventListener(event, () => {
            if (!pending?.started && el.paused) setState({ isBuffering: false });
        }, { signal: mediaEvents!.signal });

    el.addEventListener("emptied", () => {
        if (el !== detached || hasSource(el)) return;
        setState({ isPlaying: false, isBuffering: false, error: "Audio was unloaded. Try again." });
    }, { signal: mediaEvents!.signal });

    el.addEventListener("error", () => {
        if (!el.error) return;
        logger.error("Failed to play", state.track?.src, el.error);
        setState({ isPlaying: false, isBuffering: false, error: "Audio could not play. Try again." });
    }, { signal: mediaEvents!.signal });
}

function cancelPending() {
    const previous = pending;
    pending = null;
    previous?.events.abort();
    if (previous?.started) {
        try {
            previous.next.pause();
        } catch (err) {
            logger.error("Failed to pause native audio", err);
        }
        previous.next.element.pause();
    }
}

function clearDetached() {
    if (!detached) return;
    detached.pause();
    detached.replaceChildren();
    detached.removeAttribute("src");
    detached.load();
    detached.remove();
    detached = null;
    detachedSnapshot = null;
}

export function destroyPlayer() {
    cancelPending();
    watch(null, null);
    clearDetached();
    setState({ track: null, isDetached: false, isPlaying: false, currentTime: 0, duration: 0, muted: false, error: null, isBuffering: false });
}

function playCurrent() {
    const el = audio;
    const owner = native;
    const currentGeneration = generation;
    if (!el) return;
    setState({ error: null, isPlaying: true, isBuffering: el.paused || el.readyState < HTMLMediaElement.HAVE_FUTURE_DATA || !!el.error });
    const onRefused = (err: unknown) => {
        if (audio !== el || generation !== currentGeneration) return;
        const aborted = (err as Error)?.name === "AbortError";
        if (!aborted) logger.error("Failed to play", state.track?.src, err);
        setState({ isPlaying: aborted && !el.paused && !el.ended && !el.error, isBuffering: false, error: aborted ? null : "Audio could not play. Try again." });
    };
    if (audio !== el || generation !== currentGeneration) return;
    if (owner) owner.play(onRefused);
    else el.play().catch(onRefused);
}

function activateNative(next: NativeAudio, track: TrackInfo, snapshot?: DetachSnapshot) {
    cancelPending();
    const previous = audio;
    const previousNative = native;
    const wasPlaying = previous && !previous.error && !previous.ended && !previous.paused;
    // A play command only schedules native work. Keep the old source until playing.
    const transfer = { next, events: new AbortController(), started: !!snapshot };
    pending = transfer;
    const fail = (err: unknown) => {
        if (pending !== transfer) return;
        logger.error("Failed to restore native audio", err);
        const untouched = !transfer.started;
        const currentGeneration = generation;
        cancelPending();
        if (generation !== currentGeneration) return;
        if (!snapshot && untouched) return;
        if (snapshot && wasPlaying && previous?.paused) playCurrent();
        else setState({ isBuffering: false });
        refresh();
        setState({ error: "Audio could not return to the message. Try again." });
    };
    try {
        const from = snapshot ?? next.readSnapshot();
        // Resolve helpers/getters before any pause, preference write or ownership change.
        const nextState = {
            track, isDetached: false, currentTime: from.currentTime,
            duration: durationOf(next.element, track), isPlaying: !from.paused && !from.ended,
            volume: fromElementVolume(from.volume), muted: from.muted,
            error: null, isBuffering: !snapshot && !from.paused && !from.ended && next.element.readyState < HTMLMediaElement.HAVE_FUTURE_DATA
        };
        const commit = () => {
            if (pending !== transfer) return;
            transfer.events.abort();
            pending = null;
            watch(next.element, next);
            clearDetached();
            setState(nextState);
            refresh();
        };
        if (snapshot) {
            MediaPlayerPreferences.setVolume(snapshot.volume);
            MediaPlayerPreferences.setMuted(snapshot.muted);
            next.applySnapshot(snapshot);
        }
        if (pending !== transfer) return;
        transfer.started = true;
        generation++;
        if (previous && previous !== next.element) {
            previousNative?.pause();
            previous.pause();
        }
        if (pending !== transfer) return;
        if (snapshot && !from.paused && !from.ended) {
            const { signal } = transfer.events;
            next.element.addEventListener("playing", () => {
                if (!next.element.paused && !next.element.error) commit();
            }, { signal });
            next.element.addEventListener("error", () => fail(next.element.error), { once: true, signal });
            next.element.addEventListener("pause", () => {
                if (!next.element.paused) return;
                cancelPending();
                setState({ isPlaying: false, isBuffering: false });
            }, { signal });
            setState({ isPlaying: true, isBuffering: true, error: null });
            if (pending === transfer) next.play(fail);
        } else {
            if (snapshot) next.pause();
            commit();
        }
    } catch (err) {
        fail(err);
    }
}

function resumeSnapshot(from: DetachSnapshot): DetachSnapshot {
    const atEnd = from.ended || (from.paused && isAtEnd(from.currentTime, state.duration));
    return { ...from, currentTime: atEnd ? 0 : from.currentTime, paused: false, ended: false };
}

export function onNativePlay(next: NativeAudio, track: TrackInfo) {
    if (pending?.next === next && pending?.started) return;
    if (next.element.paused) return;
    if (native === next) {
        setState({ error: null });
        refresh();
        return;
    }
    try {
        const from = state.track && state.isDetached && sameTrack(state.track, track) && audio
            ? readCurrentSnapshot()
            : undefined;
        activateNative(next, track, from ? resumeSnapshot(from) : undefined);
    } catch (err) {
        logger.error("Failed to read audio state", err);
    }
}

export function restoreNativeTrack(next: NativeAudio, track: TrackInfo) {
    if (audio === next.element) {
        cancelPending();
        detached = null;
        detachedSnapshot = null;
        watch(next.element, next);
        setState({ track, isDetached: false, error: null, isBuffering: !next.element.paused && next.element.readyState < HTMLMediaElement.HAVE_FUTURE_DATA });
        refresh();
        return;
    }
    if (!audio || !state.track || !state.isDetached || !sameTrack(state.track, track)) return;
    if (pending?.next === next) return;
    cancelPending();
    const transfer = { next, events: new AbortController(), started: false };
    pending = transfer;
    const finish = () => {
        if (pending !== transfer || !audio) return;
        try {
            const from = readCurrentSnapshot();
            activateNative(next, track, next.element.paused ? from : resumeSnapshot(from));
        } catch (err) {
            cancelPending();
            logger.error("Failed to read audio state", err);
        }
    };
    if (next.element.readyState >= HTMLMediaElement.HAVE_METADATA) {
        finish();
        return;
    }

    next.element.addEventListener("loadedmetadata", finish, { once: true, signal: transfer.events.signal });
    next.element.addEventListener("error", cancelPending, { once: true, signal: transfer.events.signal });
    next.element.preload = "metadata";
    next.element.load();
}

export function detachNativeTrack(source: NativeAudio, track: TrackInfo, from: DetachSnapshot, keepPaused: boolean, host: HTMLElement | null) {
    if (pending?.next === source) {
        const resume = pending?.started && state.isPlaying;
        cancelPending();
        if (resume) playCurrent();
        else if (audio?.paused) setState({ isBuffering: false });
        refresh();
    }
    queueMicrotask(() => {
        if (native !== source || !host?.isConnected) return;
        try {
            const el = source.element;
            if (el.isConnected || ((from.paused || from.ended) && !keepPaused)) {
                watch(null, null);
                setState({ track: null, isDetached: false, isPlaying: false, currentTime: 0, duration: 0, error: null, isBuffering: false });
                return;
            }
            const snapshot = el.readyState > 0 && !el.error ? readSnapshot(el) : from;
            const volume = fromElementVolume(snapshot.volume);
            const unloaded = el.readyState === 0 && !hasSource(el);
            const playing = !unloaded && !from.paused && !from.ended && !el.ended && !el.error;
            el.hidden = true;
            host.appendChild(el);
            detached = el;
            detachedSnapshot = snapshot;
            watch(el, null);
            setState({
                track, isDetached: true, currentTime: snapshot.currentTime, duration: durationOf(el, track),
                isPlaying: playing, volume, muted: snapshot.muted,
                error: el.error ? "Audio could not play. Try again." : unloaded ? "Audio was unloaded. Try again." : null,
                isBuffering: playing && el.readyState < HTMLMediaElement.HAVE_FUTURE_DATA
            });
            if (playing && el.paused) playCurrent();
        } catch (err) {
            logger.error("Failed to retain native audio", err);
        }
    });
}

export function closeTrack() {
    cancelPending();
    const previous = audio;
    const previousNative = native;
    watch(null, null);
    previousNative?.pause();
    previous?.pause();
    clearDetached();
    setState({ track: null, isDetached: false, isPlaying: false, currentTime: 0, duration: 0, error: null, isBuffering: false });
}

export function togglePlayback() {
    if (!audio || !state.track) return;
    const wasPending = pending?.started;
    cancelPending();
    generation++;
    if (wasPending || (state.isPlaying && !state.error)) {
        if (native) native.pause();
        else audio.pause();
        setState({ isPlaying: false, isBuffering: false });
        return;
    }
    try {
        const reload = !!audio.error || (audio === detached && audio.readyState === 0 && (!!state.error || !hasSource(audio)));
        setState({ error: null, isBuffering: true });
        const replay = audio.ended || isAtEnd(state.currentTime, state.duration);
        if (reload) {
            const { currentTime, playbackRate, preservesPitch, volume, muted } = readCurrentSnapshot();
            if (audio === detached) audio.src = state.track.src;
            else audio.load();
            const from = { currentTime, playbackRate, preservesPitch, volume, muted };
            if (native) native.applySnapshot(from);
            else Object.assign(audio, from);
        }
        if (replay) seek(0);
        playCurrent();
    } catch (err) {
        logger.error("Failed to retry audio", err);
        setState({ isPlaying: false, isBuffering: false, error: "Audio could not play. Try again." });
    }
}

export function seek(time: number) {
    if (!audio || !Number.isFinite(time)) return;
    time = Math.max(0, state.duration > 0 ? Math.min(time, state.duration) : time);
    if (native) native.seek(time);
    else audio.currentTime = time;
    if (detachedSnapshot && audio === detached) detachedSnapshot.currentTime = time;
    if (pending?.started) pending.next.seek(time);
    setState({ currentTime: time });
}

export function syncPlaybackRate(rate: number) {
    if (!Number.isFinite(rate) || rate <= 0) return;
    if (!native && audio) audio.playbackRate = rate;
    if (detachedSnapshot && audio === detached) detachedSnapshot.playbackRate = rate;
    if (pending?.started) pending.next.setPlaybackRate(rate);
}

function setMuted(muted: boolean) {
    if (native) native.setMuted(muted);
    else if (audio) audio.muted = muted;
    if (detachedSnapshot && audio === detached) detachedSnapshot.muted = muted;
    if (pending?.started) pending.next.setMuted(muted);
    MediaPlayerPreferences.setMuted(muted);
    setState({ muted });
}

export function setVolume(volume: number) {
    volume = clampVolume(volume);
    const amplitude = Volume.toAmplitude(volume, 1);
    MediaPlayerPreferences.setVolume(amplitude);
    if (native) native.setVolume(amplitude);
    else if (audio) audio.volume = amplitude;
    if (detachedSnapshot && audio === detached) detachedSnapshot.volume = amplitude;
    if (pending?.started) pending.next.setVolume(amplitude);
    if (state.muted && volume > 0) setMuted(false);
    setState({ volume });
}

export function toggleMute() {
    if (state.muted) {
        setMuted(false);
        if (state.volume === 0) setVolume(volumeBeforeMute || 1);
    } else if (state.volume === 0) {
        setVolume(volumeBeforeMute || 1);
    } else {
        volumeBeforeMute = state.volume;
        setMuted(true);
    }
}
