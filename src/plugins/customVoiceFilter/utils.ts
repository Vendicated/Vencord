/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { useCallback, useEffect, useRef, useState } from "@webpack/common";

export function downloadFile(name: string, data: string): void {
    const file = new File([data], name, { type: "application/json" });
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
}

type AudioKey = string | symbol;
const globalAudio: Record<AudioKey, HTMLAudioElement | null> = {};
const defaultKey = Symbol("default_audio_key");

interface UseAudioOptions {
    source?: string; // audio url
    key?: AudioKey; // specify a different key to allow playback of multiple sounds at once
}

interface PlaySoundOptions {
    volume?: number;
    continuePlayback?: boolean;
}

export function useAudio({ source, key = defaultKey }: UseAudioOptions = {}) {
    const audioRef = useRef<HTMLAudioElement | null>(globalAudio[key] ?? null);
    const [isPlaying, setIsPlaying] = useState<boolean>(
        !!audioRef.current && !audioRef.current.paused && audioRef.current.src === source
    );

    useEffect(() => {
        if (globalAudio[key] && isPlaying) {
            globalAudio[key].addEventListener("pause", () => setIsPlaying(false), { once: true });
        }
    }, [isPlaying]);

    useEffect(() => {
        if (isPlaying && globalAudio[key] && globalAudio[key].src !== source) {
            audioRef.current?.pause();
            playSound();
        }
    }, [key, source, isPlaying]);

    const preloadSound = useCallback(() => {
        if (!source) {
            audioRef.current = null;
            return;
        }

        if (audioRef.current && audioRef.current.src === source)
            return;

        audioRef.current = new Audio(source);
        audioRef.current.preload = "auto";
    }, [source]);

    const playSound = useCallback(
        ({ volume = 1, continuePlayback }: PlaySoundOptions = {}) => {
            preloadSound();

            if (!audioRef.current) {
                delete globalAudio[key];
                return;
            }

            if (globalAudio[key]?.src !== audioRef.current.src || !continuePlayback) {
                globalAudio[key]?.pause();
                globalAudio[key] = audioRef.current;
                globalAudio[key].currentTime = 0;
            }

            globalAudio[key].volume = volume;
            globalAudio[key].play()
                .then(() => setIsPlaying(true))
                .catch(error => {
                    console.error("Error playing audio:", error);
                    setIsPlaying(false);
                });
        },
        [key, preloadSound]
    );

    const stopSound = useCallback(() => globalAudio[key]?.pause(), [key]);

    return { isPlaying, playSound, stopSound, preloadSound };
}

export const cl = classNameFactory();
