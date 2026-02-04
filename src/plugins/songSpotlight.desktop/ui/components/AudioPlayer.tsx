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

const DEFAULT_VOLUME = 0.35;

// only allow one song to play at a time
let globalPlaying: HTMLAudioElement | undefined = undefined;

export function AudioPlayer({ audioRef, list, playing, setPlaying, setLoaded }: AudioPlayerProps) {
    const urls = useMemo(() => list.map(x => x.audio?.previewUrl), [list]);
    const audios = useRef(new Map<number, HTMLAudioElement>());
    const loaded = useRef(new Set<number>());

    useEffect(() => {
        if (playing !== false) {
            const audio = audios.current.get(playing);
            if (audio && loaded.current.has(playing)) {
                if (globalPlaying) globalPlaying.pause();

                audio.currentTime = 0;
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

    const handleRef = useCallback((index: number, audio: HTMLAudioElement | null) => {
        if (audio) audios.current.set(index, audio);
        else audios.current.delete(index);
    }, []);

    const handleLoaded = useCallback((index: number) => {
        loaded.current.add(index);
        setLoaded(index, true);
    }, [setLoaded]);

    const handleErrored = useCallback((index: number) => {
        loaded.current.delete(index);
        setLoaded(index, false);
    }, [setLoaded]);

    const handleEnded = useCallback((index: number) => {
        if (playing !== index) return;

        const nextIndex = urls.findIndex((url, j) => url && j > index);
        setPlaying(nextIndex !== -1 ? nextIndex : false);
    }, [playing, setPlaying]);

    const handlePaused = useCallback((index: number) => {
        if (playing === index) {
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
