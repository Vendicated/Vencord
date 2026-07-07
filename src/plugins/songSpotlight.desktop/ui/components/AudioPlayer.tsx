/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { logger } from "@plugins/songSpotlight.desktop/lib/utils";
import { RenderInfoEntry } from "@song-spotlight/api/handlers";
import { showToast, Toasts, useCallback, useEffect, useMemo, useRef } from "@webpack/common";
import { RefObject } from "react";

interface AudioPlayerProps {
    audioRef: RefObject<HTMLAudioElement | undefined>;
    list: RenderInfoEntry[];
    playing: number | false;
    setPlaying(playing: number | false): void;
    setLoaded(index: number, state: boolean): void;
}

interface ListenerEntry {
    onPlay(): void;
    onPause(): void;
    timeout?: ReturnType<typeof setTimeout>;
}

const DEFAULT_VOLUME = 0.35;

// only allow one song to play at a time
let globalPlaying: HTMLAudioElement | undefined = undefined;

export default function AudioPlayer({ audioRef, list, playing, setPlaying, setLoaded }: AudioPlayerProps) {
    const urls = useMemo(() => list.map(x => x.audio?.previewUrl), [list]);
    const audios = useRef(new Map<number, HTMLAudioElement>());
    const loaded = useRef(new Set<number>());

    useEffect(() => {
        if (playing !== false) {
            const audio = audios.current.get(playing);
            if (audio && loaded.current.has(playing)) {
                if (globalPlaying) globalPlaying.pause();

                const previewStart = list[playing]?.audio?.previewStart;

                audio.currentTime = previewStart !== undefined ? previewStart / 1e3 : 0;
                audio.volume = DEFAULT_VOLUME;
                audio.play().catch(error => {
                    showToast("Failed to play song preview!", Toasts.Type.FAILURE);
                    logger.error("Failed to play audio", error);
                    setPlaying(false);
                });

                globalPlaying = audio;
            } else {
                setPlaying(false);
            }
        } else {
            for (const audio of audios.current.values()) {
                if (globalPlaying === audio) audio.pause();
            }
        }

        for (const audio of audios.current.values()) {
            if (audio !== globalPlaying && !audio.paused) {
                audio.pause();
            } else if (audio === globalPlaying && audio.paused) {
                globalPlaying = undefined;
                audioRef.current = undefined;
            } else if (audio === globalPlaying) {
                audioRef.current = audio;
            }
        }
    }, [playing]);

    const listenerEntries = useRef(new Map<number, ListenerEntry>());

    const handleRef = useCallback((index: number, audio: HTMLAudioElement | null) => {
        if (audio) {
            audios.current.set(index, audio);

            const listed = list[index]?.audio;
            if (!listed?.previewSlice) return;

            const entry: ListenerEntry = {
                onPlay() {
                    clearTimeout(entry.timeout);
                    entry.timeout = setTimeout(() => {
                        audio.currentTime = audio.duration;
                    }, listed.previewSlice);
                },
                onPause() {
                    clearTimeout(entry.timeout);
                },
            };

            audio.addEventListener("play", entry.onPlay);
            audio.addEventListener("pause", entry.onPause);
            listenerEntries.current.set(index, entry);
        } else {
            const audio = audios.current.get(index);
            const entry = listenerEntries.current.get(index);
            if (audio && entry) {
                clearTimeout(entry.timeout);
                audio.removeEventListener("play", entry.onPlay);
                audio.removeEventListener("pause", entry.onPause);
                listenerEntries.current.delete(index);
            }
            audios.current.delete(index);
        }
    }, [list]);

    const handleLoaded = useCallback((index: number) => {
        loaded.current.add(index);
        setLoaded(index, true);
    }, [setLoaded]);

    const handleErrored = useCallback((index: number) => {
        loaded.current.delete(index);
        setLoaded(index, false);
    }, [setLoaded]);

    // onPaused runs before onEnded
    const justPaused = useRef<number>(undefined);

    const handleEnded = useCallback((index: number) => {
        if (justPaused.current !== index && playing !== index) return;

        const nextIndex = urls.findIndex((url, j) => url && j > index);
        setPlaying(nextIndex !== -1 ? nextIndex : false);
    }, [playing, setPlaying]);

    const handlePaused = useCallback((index: number) => {
        if (playing === index) {
            justPaused.current = index;
            setPlaying(false);
        }
    }, [playing, setPlaying]);

    return (
        <div style={{ display: "none" }} aria-hidden="true">
            {urls.map((url, i) =>
                url && (
                    <audio
                        key={url}
                        src={url}
                        preload="metadata"
                        ref={audio => handleRef(i, audio)}
                        onLoadedData={() => handleLoaded(i)}
                        onError={() => handleErrored(i)}
                        onEnded={() => handleEnded(i)}
                        onPause={() => handlePaused(i)}
                    />
                )
            )}
        </div>
    );
}
