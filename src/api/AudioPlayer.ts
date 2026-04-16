/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByCodeLazy, findLazy } from "webpack";

let defaultSounds: null | string[] = null;
const findDefaultSounds = findLazy(module => module.resolve && module.id && module.keys().some(key => key.endsWith(".mp3")), false);
const AudioPlayerConstructor = findByCodeLazy("could not play audio");

export type AudioProcessor = (data: PreprocessAudioData) => void;
export type AudioCallback = (() => void);
export type AudioErrorHandler = ((error: Error) => void);
export const audioProcessorFunctions: Record<string, AudioProcessor> = {};

export enum AudioType {
    /** An external URL that follows the Content Security Policy. */
    URL = "url",
    /** A base64-encoded data URI. */
    DATA = "data-uri",
    /** A Blob URI. */
    BLOB = "blob",
    /** A file path. */
    PATH = "file-path",
    /** An internal Discord audio filename (e.g. "discodo"). */
    DISCORD = "discord",
    /** Any other unrecognized audio type. */
    OTHER = "other"
}

export interface PreprocessAudioData {
    /** The original audio string passed to the player. */
    audio: string;
    /** The read-only type of audio of the original audio string. */
    readonly type: AudioType;
    /** The volume of the original audio between 0 and 100. */
    volume: number;
    /** The playback speed of the original audio between 0.0625 and 16. */
    speed: number;
}

export interface AudioPlayerInternal {
    preprocessDataOriginal: PreprocessAudioData;
    preprocessDataPrevious: PreprocessAudioData | null;
    preprocessDataCurrent: PreprocessAudioData;
    audio: string;
    _audio: null | Promise<HTMLAudioElement>;
    _volume: number;
    _speed: number;
    outputChannel: string;
    type: AudioType;
    preload: boolean;
    persistent: boolean;
    onEnded?: AudioCallback;
    onError?: AudioErrorHandler;
    processAudio: () => void;
    ensureAudio(): Promise<HTMLAudioElement>;
    destroyAudio(): void;
    loop(): void;
    play(): void;
    pause(): void;
    stop(restart?: boolean): void;
}

export interface AudioPlayerInterface {
    /** The internal Discord audio filename (e.g. "discodo"), a data URI, or an external URL that follows the CSP. */
    audio: string;
    /** The read-only type of audio determined during processing. */
    readonly type: AudioType;
    /** The duration of the audio in seconds, or null if not yet loaded. */
    readonly duration: Promise<number> | null;
    /** The current time of the audio in seconds, or null if not yet loaded. */
    time: Promise<number> | null;
    /** The paused state of the audio, or null if not yet loaded. */
    paused: Promise<boolean> | null;
    /** The muted state of the audio, or null if not yet loaded. */
    muted: Promise<boolean> | null;
    /** The volume of the audio between 0 and 100. */
    volume: number;
    /** The playback speed of the audio between 0.0625 and 16. */
    speed: number;
    /** Whether to load the audio immediately. If persistent is false, this will only apply until the first playback. */
    preload: boolean;
    /** Whether the audio element is persistent and not recreated for every playback. */
    persistent: boolean;
    /** Preloads the audio before playback. Automatically called when persistent is true. */
    load(): void;
    /** Sets the audio to loop until paused or stopped. */
    loop(): void;
    /** Plays the audio. */
    play(): void;
    /** Pauses the audio. */
    pause(): void;
    /** Stops the audio. */
    stop(): void;
    /** Plays the audio from the beginning. */
    restart(): void;
    /** Seeks to a specific time in seconds. */
    seek(time: number): void;
    /** Mutes the audio. */
    mute(): void;
    /** Unmutes the audio. */
    unmute(): void;
    /** Deletes the audio element. Necessary if persistent is true. */
    delete(): void;
}

export interface AudioPlayerOptions {
    /** The volume of the audio, between 0 and 100, defaulting to 100. */
    volume?: number;
    /** The playback speed of the audio, between 0.0625 and 16, defaulting to 1. */
    speed?: number;
    /** Whether to preload the audio as soon as the player is created. */
    preload?: boolean;
    /** Whether the audio element is persistent and not recreated for every playback. If persistent, you must call delete() to free the memory. Defaults to false. */
    persistent?: boolean;
    /** An optional callback that is called every time the audio finishes playing. */
    onEnded?: AudioCallback;
    /** An optional error handler that is called when an error occurs during audio playback. */
    onError?: AudioErrorHandler;
}

// Wrap the player to allow reprocessing the audio when properties are changed and to alleviate
// the confusion between the public API accepting 0-100 volume while the internal API uses 0-1 volume.
class AudioPlayerWrapper implements AudioPlayerInterface {
    private internalPlayer: AudioPlayerInternal;
    constructor(internalPlayer: AudioPlayerInternal) { this.internalPlayer = internalPlayer; }

    get audio(): string { return this.internalPlayer.audio; }
    set audio(value: string) { this.internalPlayer.preprocessDataOriginal.audio = value; this.internalPlayer.processAudio(); }

    get volume(): number { return this.internalPlayer._volume * 100; }
    set volume(value: number) { this.internalPlayer.preprocessDataOriginal.volume = Math.max(0, Math.min(1, value / 100)); this.internalPlayer.processAudio(); }

    get speed(): number { return this.internalPlayer._speed; }
    set speed(value: number) { this.internalPlayer.preprocessDataOriginal.speed = Math.max(0.0625, Math.min(16, value)); this.internalPlayer.processAudio(); }

    get time(): Promise<number> | null { return this.internalPlayer._audio?.then(audio => audio.currentTime) ?? null; }
    set time(value: number) { this.internalPlayer.ensureAudio().then(audio => audio.currentTime = value); }

    get persistent(): boolean { return this.internalPlayer.persistent; }
    set persistent(value: boolean) { this.internalPlayer.persistent = value; }

    get preload(): boolean { return this.internalPlayer.preload; }
    set preload(value: boolean) { this.internalPlayer.preload = value; value && this.internalPlayer.ensureAudio(); }

    get muted(): Promise<boolean> | null { return this.internalPlayer._audio?.then(audio => audio.muted) ?? null; }
    set muted(value: boolean) { this.internalPlayer.ensureAudio().then(audio => audio.muted = value); }

    get paused(): Promise<boolean> | null { return this.internalPlayer._audio?.then(audio => audio.paused) ?? null; }
    set paused(value: boolean) { value ? this.internalPlayer.pause() : this.internalPlayer.play(); }

    get type(): AudioType { return this.internalPlayer.type; }
    get duration(): Promise<number> | null { return this.internalPlayer._audio?.then(audio => audio.duration) ?? null; }

    load(): void { this.internalPlayer.ensureAudio(); }
    loop(): void { this.internalPlayer.loop(); }
    play(): void { this.internalPlayer.play(); }
    pause(): void { this.internalPlayer.pause(); }
    stop(restart?: boolean): void { this.internalPlayer.stop(restart); }
    restart(): void { this.internalPlayer.stop(true); }
    seek(time: number): void { this.internalPlayer.ensureAudio().then(audio => audio.currentTime = time); }
    mute(): void { this.internalPlayer.ensureAudio().then(audio => audio.muted = true); }
    unmute(): void { this.internalPlayer.ensureAudio().then(audio => audio.muted = false); }
    delete(): void { this.internalPlayer.destroyAudio(); }
}

/**
 * Creates an audio player.
 * @param audio The internal Discord audio filename (e.g. "discodo"), a data URI, or an external URL that follows the CSP.
 * @param options Additional options for the audio player.
 * @param options.volume The volume of the audio, between 0 and 100, defaulting to 100.
 * @param options.speed The playback speed of the audio, between 0.0625 and 16, defaulting to 1.
 * @param options.preload Whether to load the audio immediately. If persistent is false, this will only apply until the first playback.
 * @param options.persistent Whether the audio element is persistent and not recreated for every playback. If persistent, you must call delete() to free the memory. Defaults to false.
 * @param options.onEnded An optional callback that is called every time the audio finishes playing.
 * @param options.onError An optional error handler that is passed an Error object when an error occurs during audio playback.
 * @return The created audio player.
 */
export function createAudioPlayer(
    audio: string,
    options: AudioPlayerOptions = {}
): AudioPlayerInterface {
    const internalPlayer: AudioPlayerInternal = new AudioPlayerConstructor(
        audio,
        null,
        null,
        "default",
        options
    );

    return new AudioPlayerWrapper(internalPlayer);
}

/**
 * Plays an audio instantly and returns the player.
 * @param audio The internal Discord audio filename (e.g. "discodo"), a data URI, or an external URL that follows the CSP.
 * @param options Additional options for the audio player.
 * @param options.volume The volume of the audio, between 0 and 100, defaulting to 100.
 * @param options.speed The playback speed of the audio, between 0.0625 and 16, defaulting to 1.
 * @param options.preload Whether to load the audio immediately. If persistent is false, this will only apply until the first playback.
 * @param options.persistent Whether the audio element is persistent and not recreated for every playback. If persistent, you must call delete() to free the memory. Defaults to false.
 * @param options.onEnded An optional callback that is called every time the audio finishes playing.
 * @param options.onError An optional error handler that is passed an Error object when an error occurs during audio playback.
 * @return The created audio player.
 */
export function playAudio(audio: string, options: AudioPlayerOptions = {}): AudioPlayerInterface {
    const player = createAudioPlayer(audio, options);
    player.play();
    return player;
}

/**
 * Identifies the type of audio based on its string.
 * @param audio The audio string to identify.
 * @returns The identified AudioType.
 */
export function identifyAudioType(audio: string): AudioType {
    if (defaultAudioNames().includes(audio)) return AudioType.DISCORD;

    try {
        const url = new URL(audio);
        if (url.protocol === "http:" || url.protocol === "https:") return AudioType.URL;
        if (url.protocol === "data:") return AudioType.DATA;
        if (url.protocol === "blob:") return AudioType.BLOB;
        if (url.protocol === "file:") return AudioType.PATH;
        return AudioType.OTHER;
    } catch {
        return AudioType.OTHER;
    }
}

/**
 * Adds a function to process an audio before it is played.
 * @param key A unique identifier for this audio processor. Plugin name is recommended.
 * @param processor A function that takes a data object with audio, volume (0-100), and type (AudioType) attributes, and modifies the audio and volume in place.
 */
export function addAudioProcessor(key: string, processor: AudioProcessor): void {
    audioProcessorFunctions[key] = processor;
}

/**
 * Removes an audio processor by its key.
 * @param key The unique identifier of the audio processor to remove.
 */
export function removeAudioProcessor(key: string): void {
    delete audioProcessorFunctions[key];
}

/** Returns an array of all internal Discord audio filenames. */
export function defaultAudioNames(): string[] {
    defaultSounds ??= (findDefaultSounds.keys() || []).map(key => {
        const match = key.match(/((?:\w|-)+)\.mp3$/);
        return match ? match[1] : null;
    }).filter(Boolean) as string[];

    return defaultSounds;
}
