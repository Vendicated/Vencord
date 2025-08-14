/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { findByPropsLazy } from "@webpack";
import { React, useEffect, useState, useStateFromStores } from "@webpack/common";

import { settings } from "../../../settings";
import { SpotifyStore } from "../../SpotifyStore";
import { SpotifyLrcStore } from "../providers/store";
import { SyncedLyric } from "../providers/types";

export const scrollClasses = findByPropsLazy("auto", "customTheme");

export const cl = classNameFactory("vc-spotify-lyrics-");

export function NoteSvg() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 480 720" fill="currentColor" className={cl("music-note")}>
            <path d="m160,-240 q -66,0 -113,-47 -47,-47 -47,-113 0,-66 47,-113 47,-47 113,-47 23,0 42.5,5.5 19.5,5.5 37.5,16.5 v -422 h 240 v 160 H 320 v 400 q 0,66 -47,113 -47,47 -113,47 z" />
        </svg>
    );
}


const getIndexes = (lyrics: SyncedLyric[], position: number, delay: number) => {
    const posInSec = (position + delay) / 1000;

    let left = 0, right = lyrics.length - 1;
    let currentIndex: number | null = null;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const curr = lyrics[mid];
        const next = lyrics[mid + 1];

        if (curr.time <= posInSec && (!next || next.time > posInSec)) {
            currentIndex = mid;
            break;
        }

        if (curr.time > posInSec) {
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }

    const nextIdx = currentIndex !== null ? currentIndex + 1 : left;
    const nextLyricIdx = nextIdx < lyrics.length ? nextIdx : null;

    if (currentIndex !== null && posInSec - lyrics[currentIndex].time > 8) {
        return [null, nextLyricIdx];
    }

    return [currentIndex, nextLyricIdx];
};

export function useLyrics({ scroll = true }: { scroll?: boolean; } = {}) {
    const [track, storePosition, isPlaying] = useStateFromStores(
        [SpotifyStore], () => [
            SpotifyStore.track,
            SpotifyStore.mPosition,
            SpotifyStore.isPlaying,
        ]);
    const lyricsInfo = useStateFromStores([SpotifyLrcStore], () => SpotifyLrcStore.lyricsInfo);

    const { LyricDelay } = settings.use(["LyricDelay"]);

    const [currLrcIndex, setCurrLrcIndex] = useState<number | null>(null);
    const [nextLyric, setNextLyric] = useState<number | null>(null);
    const [position, setPosition] = useState(storePosition);
    const [lyricRefs, setLyricRefs] = useState<React.RefObject<HTMLDivElement | null>[]>([]);

    const currentLyrics = lyricsInfo?.lyricsVersions[lyricsInfo.useLyric];

    useEffect(() => {
        if (currentLyrics) {
            setLyricRefs(currentLyrics.map(() => React.createRef()));
        }
    }, [currentLyrics]);


    useEffect(() => {
        if (currentLyrics && position != null) {
            const [currentIndex, nextLyricIndex] = getIndexes(currentLyrics, position, LyricDelay);
            setCurrLrcIndex(currentIndex);
            setNextLyric(nextLyricIndex);
        } else {
            setCurrLrcIndex(null);
            setNextLyric(null);
        }
    }, [currentLyrics, position, LyricDelay]);

    useEffect(() => {
        if (scroll && currLrcIndex !== null) {
            if (currLrcIndex >= 0) {
                lyricRefs[currLrcIndex].current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            if (currLrcIndex < 0 && nextLyric !== null) {
                lyricRefs[nextLyric]?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }, [currLrcIndex, nextLyric, scroll, lyricRefs]);

    useEffect(() => {
        if (!isPlaying) return;

        setPosition(SpotifyStore.position);
        const interval = setInterval(() => setPosition(p => p + 1000), 1000);

        return () => clearInterval(interval);
    }, [storePosition, isPlaying]);

    return { track, lyricsInfo, lyricRefs, currLrcIndex, nextLyric };
}
