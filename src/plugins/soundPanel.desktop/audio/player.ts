/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getFileUrl, getItems, LibraryItem, releaseFileUrl } from "@plugins/soundPanel.desktop/data/library";
import { RepeatMode, settings } from "@plugins/soundPanel.desktop/settings";
import { logger } from "@plugins/soundPanel.desktop/utils/logger";
import { createStore, useStore } from "@plugins/soundPanel.desktop/utils/store";

import { connectToOutputs, getAudioContext, routeToOutputDevice, setPlaybackActive } from "./mixer";

interface Clip {
    key: string;
    localOnly: boolean;
    dispose(): void;
}

const clips = new Set<Clip>();

export const clipStore = createStore({ playing: [] as string[] });

export const musicStore = createStore({
    currentId: null as string | null,
    playing: false,
    position: 0,
    duration: 0
});

let musicAudio: HTMLAudioElement | null = null;
let musicSource: MediaElementAudioSourceNode | null = null;
let musicGain: GainNode | null = null;

function updatePlaybackActive() {
    setPlaybackActive([...clips].some(clip => !clip.localOnly) || musicStore.get().playing);
}

function syncClips() {
    clipStore.set({ playing: [...clips].map(clip => clip.key) });
    updatePlaybackActive();
}

function routeThroughMixer(audio: HTMLAudioElement, volume: number) {
    const ctx = getAudioContext();
    const source = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    connectToOutputs(gain);

    return () => {
        source.disconnect();
        gain.disconnect();
    };
}

function playDirectly(audio: HTMLAudioElement, volume: number) {
    audio.volume = Math.min(1, volume * (settings.store.localVolume / 100));
    void routeToOutputDevice(audio);
    return () => { };
}

export async function playClip({ key, url, volume, localOnly = false }: { key: string; url: string; volume: number; localOnly?: boolean; }) {
    if (!settings.store.allowOverlap) stopClips();

    const audio = new Audio(url);
    const disconnect = localOnly ? playDirectly(audio, volume) : routeThroughMixer(audio, volume);

    const clip: Clip = {
        key,
        localOnly,
        dispose() {
            if (!clips.delete(clip)) return;

            audio.pause();
            audio.removeAttribute("src");
            audio.load();
            disconnect();
            syncClips();
        }
    };

    audio.addEventListener("ended", clip.dispose);
    audio.addEventListener("error", () => {
        logger.error(`Failed to load audio for ${key}`, audio.error);
        clip.dispose();
    });
    clips.add(clip);
    syncClips();

    try {
        await audio.play();
    } catch (err) {
        clip.dispose();
        throw err;
    }
}

export async function playLibrarySound(item: LibraryItem, localOnly = false) {
    await playClip({ key: item.id, url: await getFileUrl(item.id), volume: item.volume, localOnly });
}

export function stopClip(key: string) {
    [...clips].filter(clip => clip.key === key).forEach(clip => clip.dispose());
}

function stopClips() {
    [...clips].forEach(clip => clip.dispose());
}

function getMusicElement() {
    if (musicAudio) return musicAudio;

    const ctx = getAudioContext();
    const audio = musicAudio = new Audio();
    musicSource = ctx.createMediaElementSource(audio);
    musicGain = ctx.createGain();
    musicSource.connect(musicGain);
    connectToOutputs(musicGain);
    applyMusicVolume();

    const setPlaying = (playing: boolean) => {
        musicStore.set({ playing });
        updatePlaybackActive();
    };

    audio.addEventListener("timeupdate", () => musicStore.set({ position: audio.currentTime }));
    audio.addEventListener("durationchange", () => musicStore.set({ duration: Number.isFinite(audio.duration) ? audio.duration : 0 }));
    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("ended", onTrackEnded);

    return audio;
}

function getCurrentTrack() {
    const { currentId } = musicStore.get();
    return getItems("music").find(item => item.id === currentId);
}

export function applyMusicVolume() {
    if (musicGain) musicGain.gain.value = (settings.store.musicVolume / 100) * (getCurrentTrack()?.volume ?? 1);
}

export async function playTrack(id: string) {
    const audio = getMusicElement();
    const url = await getFileUrl(id);
    audio.src = url;
    switchTrack(id);
    applyMusicVolume();
    await audio.play();
}

function switchTrack(id: string) {
    const previous = musicStore.get().currentId;
    musicStore.set({ currentId: id, position: 0, duration: 0 });
    if (previous && previous !== id) releaseFileUrl(previous);
}

export async function toggleMusic() {
    const audio = getMusicElement();

    if (!getCurrentTrack()) {
        const [first] = getItems("music");
        if (first) await playTrack(first.id);
    } else if (audio.paused) {
        await audio.play();
    } else {
        audio.pause();
    }
}

export async function skipTrack(direction: 1 | -1, automatic = false) {
    const tracks = getItems("music");
    if (!tracks.length) return;

    if (direction === -1 && musicAudio && musicAudio.currentTime > 3) {
        musicAudio.currentTime = 0;
        return;
    }

    const index = tracks.findIndex(track => track.id === musicStore.get().currentId);
    let next: number;

    if (settings.store.shuffle && tracks.length > 1) {
        do next = Math.floor(Math.random() * tracks.length);
        while (next === index);
    } else if (index === -1) {
        next = direction === 1 ? 0 : tracks.length - 1;
    } else {
        next = index + direction;

        if (next < 0 || next >= tracks.length) {
            if (automatic && settings.store.repeatMode === "off") {
                stopMusic();
                return;
            }
            next = (next + tracks.length) % tracks.length;
        }
    }

    await playTrack(tracks[next].id);
}

function onTrackEnded() {
    if (settings.store.repeatMode === "one" && musicAudio) {
        musicAudio.currentTime = 0;
        musicAudio.play().catch(err => logger.error("Failed to repeat the track", err));
        return;
    }

    skipTrack(1, true).catch(err => logger.error("Failed to play the next track", err));
}

export function seekMusic(seconds: number) {
    if (!musicAudio || !Number.isFinite(seconds)) return;

    musicAudio.currentTime = seconds;
    musicStore.set({ position: seconds });
}

function stopMusic() {
    if (!musicAudio) return;

    musicAudio.pause();
    musicAudio.currentTime = 0;
    musicStore.set({ position: 0 });
}

export function releaseTrack(id: string) {
    if (!musicAudio || musicStore.get().currentId !== id) return;

    musicAudio.pause();
    musicAudio.removeAttribute("src");
    musicAudio.load();
    musicStore.set({ currentId: null, playing: false, position: 0, duration: 0 });
}

const REPEAT_ORDER: RepeatMode[] = ["all", "one", "off"];

export function cycleRepeatMode() {
    const current = REPEAT_ORDER.indexOf(settings.store.repeatMode as RepeatMode);
    settings.store.repeatMode = REPEAT_ORDER[(current + 1) % REPEAT_ORDER.length];
}

export function toggleShuffle() {
    settings.store.shuffle = !settings.store.shuffle;
}

export function stopAll() {
    stopClips();
    musicAudio?.pause();
}

export function disposePlayer() {
    stopClips();

    if (musicAudio) {
        musicAudio.pause();
        musicAudio.removeAttribute("src");
        musicAudio.load();
    }
    musicSource?.disconnect();
    musicGain?.disconnect();
    musicAudio = musicSource = musicGain = null;

    musicStore.set({ currentId: null, playing: false, position: 0, duration: 0 });
    setPlaybackActive(false);
}

export function useIsPlaying() {
    const clipsPlaying = useStore(clipStore, s => s.playing.length > 0);
    const musicPlaying = useStore(musicStore, s => s.playing);
    return clipsPlaying || musicPlaying;
}
