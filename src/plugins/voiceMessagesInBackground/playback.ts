/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxDispatcher, SelectedChannelStore, useEffect, useRef } from "@webpack/common";
import type { Dispatch, SetStateAction } from "react";

type NativePlayingState = [boolean, Dispatch<SetStateAction<boolean>>];

interface ActivePlayback {
    attached: boolean;
    cacheKey?: string;
    channelId?: string;
    duration: number;
    paused: boolean;
    player: HTMLAudioElement;
    position: number;
    setNativePlaying?: Dispatch<SetStateAction<boolean>>;
    setNativePosition?: Dispatch<SetStateAction<number>>;
    speed: number;
    src: string;
    updatedAt: number;
}

export interface PlaybackSnapshot {
    channelId?: string;
    duration: number;
    paused: boolean;
    position: number;
    speed: number;
    src: string;
}

let active: ActivePlayback | undefined;
let lastCacheSync = 0;
let voicePlaybackSpeed = 1;

const NATIVE_END_EPSILON = 0.001;
const playbackListeners = new Set<() => void>();

function notifyPlayback() {
    playbackListeners.forEach(listener => listener());
}

export function subscribePlayback(listener: () => void) {
    playbackListeners.add(listener);
    return () => {
        playbackListeners.delete(listener);
    };
}

function samePlayback(current: ActivePlayback, src: string, cacheKey?: string) {
    return current.src === src && (!cacheKey || !current.cacheKey || current.cacheKey === cacheKey);
}

function clampPosition(current: ActivePlayback, position: number) {
    if (!Number.isFinite(position)) return 0;

    const safePosition = Math.max(0, position);
    return current.duration > 0 ? Math.min(safePosition, current.duration) : safePosition;
}

function playbackPosition(current: ActivePlayback) {
    const playerPosition = current.player.currentTime;
    if (current.player.readyState > 0 && Number.isFinite(playerPosition)) {
        return clampPosition(current, playerPosition);
    }

    if (current.paused) return current.position;
    return clampPosition(current, current.position + (Date.now() - current.updatedAt) / 1000 * current.speed);
}

function updatePosition(current: ActivePlayback, position: number) {
    current.position = clampPosition(current, position);
    current.updatedAt = Date.now();
}

function isAtEnd(current: ActivePlayback, position: number) {
    return current.duration > 0 && position >= current.duration - NATIVE_END_EPSILON;
}

function seekPlayer(current: ActivePlayback, position: number) {
    if (current.player.readyState === 0) return;

    try {
        current.player.currentTime = clampPosition(current, position);
    } catch { }
}

function playPlayer(current: ActivePlayback) {
    try {
        void current.player.play().catch(() => {
            if (active === current && !current.paused) stopPlayback();
        });
    } catch {
        if (active === current && !current.paused) stopPlayback();
    }
}

function syncPlaybackCache(current: ActivePlayback, force = false) {
    if (!current.cacheKey || current.duration <= 0) return;

    const now = Date.now();
    if (!force && now - lastCacheSync < 1000) return;
    lastCacheSync = now;
    FluxDispatcher.dispatch({
        type: "MEDIA_PLAYBACK_POSITION_UPDATE",
        cacheKey: current.cacheKey,
        position: playbackPosition(current),
        duration: current.duration
    });
}

export function stopPlayback() {
    const current = active;
    if (!current) return;

    active = undefined;
    current.setNativePlaying?.(false);
    current.setNativePosition?.(0);
    current.player.onloadedmetadata = null;
    current.player.ondurationchange = null;
    current.player.ontimeupdate = null;
    current.player.onended = null;
    current.player.onerror = null;
    current.player.pause();

    if (current.cacheKey) {
        FluxDispatcher.dispatch({
            type: "MEDIA_PLAYBACK_POSITION_UPDATE",
            cacheKey: current.cacheKey,
            position: 0,
            duration: Math.max(current.duration, 1)
        });
    }

    notifyPlayback();
}

function createBackgroundPlayback(src: string, cacheKey: string | undefined, position: number) {
    stopPlayback();

    const player = new Audio();
    player.preload = "auto";
    player.muted = true;
    player.playbackRate = voicePlaybackSpeed;

    const current: ActivePlayback = active = {
        attached: true,
        cacheKey,
        channelId: SelectedChannelStore.getChannelId(),
        duration: 0,
        paused: false,
        player,
        position: Math.max(0, position),
        speed: voicePlaybackSpeed,
        src,
        updatedAt: Date.now()
    };

    const updateDuration = () => {
        if (active !== current || !Number.isFinite(player.duration) || player.duration <= 0) return;

        current.duration = player.duration;
        updatePosition(current, current.position);
        seekPlayer(current, current.position);
        syncPlaybackCache(current, true);
        if (current.paused && isAtEnd(current, current.position)) {
            stopPlayback();
        } else {
            notifyPlayback();
        }
    };

    player.onloadedmetadata = updateDuration;
    player.ondurationchange = updateDuration;
    player.ontimeupdate = () => {
        if (active !== current) return;

        updatePosition(current, player.currentTime);
        syncPlaybackCache(current);
    };
    player.onended = () => {
        if (active === current) stopPlayback();
    };
    player.onerror = () => {
        if (active === current) stopPlayback();
    };
    player.src = src;

    lastCacheSync = 0;
    notifyPlayback();
    return current;
}

function syncPlayerToNative(current: ActivePlayback, position: number, force = false) {
    const playerPosition = current.player.currentTime;
    if (force || !Number.isFinite(playerPosition) || Math.abs(playerPosition - position) > 0.25) {
        seekPlayer(current, position);
    }
}

function playFromNative(
    src: string,
    cacheKey: string | undefined,
    position: number,
    setNativePlaying: Dispatch<SetStateAction<boolean>>,
    setNativePosition: Dispatch<SetStateAction<number>>
) {
    const current = active && samePlayback(active, src, cacheKey)
        ? active
        : createBackgroundPlayback(src, cacheKey, position);

    current.attached = true;
    current.cacheKey = cacheKey;
    current.paused = false;
    current.setNativePlaying = setNativePlaying;
    current.setNativePosition = setNativePosition;
    updatePosition(current, position);
    current.player.muted = true;
    current.player.playbackRate = current.speed;
    syncPlayerToNative(current, position, true);
    playPlayer(current);
    syncPlaybackCache(current, true);
    notifyPlayback();
}

function pauseFromNative(src: string, cacheKey: string | undefined, position: number) {
    const current = active;
    if (!current || !samePlayback(current, src, cacheKey) || !current.attached) return;

    if (current.player.ended || isAtEnd(current, position)) {
        stopPlayback();
        return;
    }

    updatePosition(current, position);
    current.paused = true;
    current.player.pause();
    seekPlayer(current, current.position);
    syncPlaybackCache(current, true);
    notifyPlayback();
}

export function useBackgroundPlayback(
    nativeState: NativePlayingState,
    nativePosition: number,
    src: string,
    cacheKey: string | undefined,
    setNativePosition: Dispatch<SetStateAction<number>>
) {
    const [nativePlaying, setNativePlaying] = nativeState;
    const nativePlayingRef = useRef(nativePlaying);
    const nativePositionRef = useRef(nativePosition);
    nativePlayingRef.current = nativePlaying;
    nativePositionRef.current = nativePosition;

    useEffect(() => {
        const current = active;
        if (current && samePlayback(current, src, cacheKey) && !current.attached) {
            const position = playbackPosition(current);
            const playing = !current.paused;
            updatePosition(current, position);
            current.attached = true;
            current.setNativePlaying = setNativePlaying;
            current.setNativePosition = setNativePosition;
            current.player.muted = true;
            syncPlayerToNative(current, position, true);
            playing ? playPlayer(current) : current.player.pause();
            nativePlayingRef.current = playing;
            nativePositionRef.current = position;
            setNativePosition(position);
            setNativePlaying(playing);
            syncPlaybackCache(current, true);
            notifyPlayback();
        }

        return () => {
            const current = active;
            if (!current || !samePlayback(current, src, cacheKey) || current.setNativePlaying !== setNativePlaying) return;

            updatePosition(current, nativePositionRef.current);
            current.attached = false;
            current.paused = !nativePlayingRef.current;
            current.setNativePlaying = undefined;
            current.setNativePosition = undefined;
            syncPlayerToNative(current, current.position, true);
            current.player.muted = false;
            current.paused ? current.player.pause() : playPlayer(current);
            syncPlaybackCache(current, true);
            notifyPlayback();
        };
    }, [cacheKey, setNativePlaying, setNativePosition, src]);

    useEffect(() => {
        nativePlayingRef.current
            ? playFromNative(src, cacheKey, nativePositionRef.current, setNativePlaying, setNativePosition)
            : pauseFromNative(src, cacheKey, nativePositionRef.current);
    }, [cacheKey, nativePlaying, setNativePlaying, setNativePosition, src]);

    useEffect(() => {
        const current = active;
        if (!current || !samePlayback(current, src, cacheKey) || current.setNativePosition !== setNativePosition) return;

        updatePosition(current, nativePositionRef.current);
        syncPlayerToNative(current, nativePositionRef.current);
        syncPlaybackCache(current);
    }, [cacheKey, nativePosition, setNativePosition, src]);

    return nativeState;
}

export function getPlaybackSnapshot(): PlaybackSnapshot | undefined {
    const current = active;
    if (!current) return;

    return {
        channelId: current.channelId,
        duration: current.duration,
        paused: current.paused,
        position: playbackPosition(current),
        speed: current.speed,
        src: current.src
    };
}

export function togglePlayback() {
    const current = active;
    if (!current) return;

    if (current.attached && current.setNativePlaying) {
        current.setNativePlaying(current.paused);
        return;
    }

    updatePosition(current, playbackPosition(current));
    current.paused = !current.paused;
    current.paused ? current.player.pause() : playPlayer(current);
    syncPlaybackCache(current, true);
    notifyPlayback();
}

export function seekPlayback(position: number) {
    const current = active;
    if (!current) return;

    updatePosition(current, position);
    seekPlayer(current, current.position);
    current.setNativePosition?.(current.position);
    syncPlaybackCache(current, true);
    notifyPlayback();
}

export function setPlaybackSpeed(speed: number) {
    const current = active;
    if (!current) return;

    updatePosition(current, playbackPosition(current));
    current.speed = speed;
    current.player.playbackRate = speed;
    FluxDispatcher.dispatch({
        type: "MEDIA_PLAYBACK_RATE_UPDATE",
        playbackType: "voice_message",
        rate: speed
    });
    notifyPlayback();
}

export function handlePlaybackRateUpdate(speed: number) {
    voicePlaybackSpeed = speed;
    const current = active;
    if (!current || current.speed === speed) return;

    updatePosition(current, playbackPosition(current));
    current.speed = speed;
    current.player.playbackRate = speed;
    notifyPlayback();
}
