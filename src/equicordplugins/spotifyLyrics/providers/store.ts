/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";
import { Track } from "plugins/spotifyControls/SpotifyStore";

import { getLyrics, lyricFetchers, updateLyrics } from "../api";
import settings from "../settings";
import { romanizeLyrics, translateLyrics } from "./translator";
import { LyricsData, Provider } from "./types";

interface PlayerStateMin {
    track: Track | null;
    device?: Device;
    isPlaying: boolean,
    position: number,
}

interface Device {
    id: string;
    is_active: boolean;
}

function showNotif(title: string, body: string) {
    if (settings.store.ShowFailedToasts) {
        showNotification({
            color: "#ee2902",
            title,
            body,
            noPersist: true
        });
    }
}

// steal from spotifycontrols
export const SpotifyLrcStore = proxyLazyWebpack(() => {
    class SpotifyLrcStore extends Flux.Store {
        public mPosition = 0;
        private start = 0;

        public track: Track | null = null;
        public device: Device | null = null;
        public isPlaying = false;
        public lyricsInfo: LyricsData | null = null;
        public fetchingsTracks: string[] = [];


        public get position(): number {
            let pos = this.mPosition;
            if (this.isPlaying) {
                pos += Date.now() - this.start;
            }
            return pos;
        }

        public set position(p: number) {
            this.mPosition = p;
            this.start = Date.now();
        }
    }

    const store = new SpotifyLrcStore(FluxDispatcher, {
        async SPOTIFY_PLAYER_STATE(e: PlayerStateMin) {
            if (store.fetchingsTracks.includes(e.track?.id ?? "")) return;

            store.fetchingsTracks.push(e.track?.id ?? "");
            store.track = e.track;
            store.isPlaying = e.isPlaying ?? false;
            store.position = e.position ?? 0;
            store.device = e.device ?? null;
            store.lyricsInfo = await getLyrics(e.track);
            const { LyricsConversion } = settings.store;
            if (LyricsConversion !== Provider.None) {
                // @ts-ignore
                FluxDispatcher.dispatch({ type: "SPOTIFY_LYRICS_PROVIDER_CHANGE", provider: LyricsConversion });
            }

            store.fetchingsTracks = store.fetchingsTracks.filter(id => id !== e.track?.id);
            store.emitChange();
        },

        SPOTIFY_SET_DEVICES({ devices }: { devices: Device[]; }) {
            store.device = devices.find(d => d.is_active) ?? devices[0] ?? null;
            store.emitChange();
        },

        // @ts-ignore
        async SPOTIFY_LYRICS_PROVIDER_CHANGE(e: { provider: Provider; }) {
            const currentInfo = await getLyrics(store.track);
            const { provider } = e;
            if (currentInfo?.useLyric === provider) return;

            if (currentInfo?.lyricsVersions[provider]) {
                store.lyricsInfo = { ...currentInfo, useLyric: provider };

                await updateLyrics(store.track!.id, currentInfo.lyricsVersions[provider]!, provider);
                store.emitChange();
                return;
            }
            // stops spamming noftications for translation when there is no lyrics x1
            if (provider === Provider.Translated || provider === Provider.Romanized) {
                if (!currentInfo?.useLyric || !currentInfo.lyricsVersions[currentInfo.useLyric]) {
                    console.log("Failed to Translate");
                    const now = Date.now();
                    if (!window.__lastTranslateFailure) {
                        window.__lastTranslateFailure = now;
                    } else if (now - window.__lastTranslateFailure < 120000) { // 2 minutes
                        window.__lastTranslateFailure = null;
                        return null;
                    } else {
                        window.__lastTranslateFailure = now;
                    }
                    return null;
                }

                const fetcher = provider === Provider.Translated ? translateLyrics : romanizeLyrics;

                const fetchResult = await fetcher(currentInfo.lyricsVersions[currentInfo.useLyric]);
                // stops spamming noftications for when there is no lyrics / cannot be translated x2
                if (!fetchResult) {
                    console.log("Lyrics fetch failed", `Failed to fetch ${provider === Provider.Translated ? "translation" : "romanization"}`);
                    const now = Date.now();
                    if (!window.__lastTranslateFailure) {
                        window.__lastTranslateFailure = now;
                    } else if (now - window.__lastTranslateFailure < 120000) { // 2 minutes
                        window.__lastTranslateFailure = null;
                        return null;
                    } else {
                        window.__lastTranslateFailure = now;
                    }
                    return null;
                }

                store.lyricsInfo = {
                    ...currentInfo,
                    useLyric: provider,
                    lyricsVersions: {
                        ...currentInfo.lyricsVersions,
                        [Provider.Translated]: fetchResult
                    }
                };

                await updateLyrics(store.track!.id, fetchResult, provider);

                store.emitChange();
                return;
            }

            const newLyricsInfo = await lyricFetchers[e.provider](store.track!);
            // stops spamming noftications for when there is no lyrics / cannot be translated x3
            if (!newLyricsInfo) {
                console.log("Lyrics fetch failed", `Failed to fetch ${e.provider} lyrics`);
                const now = Date.now();
                if (!window.__lastLyricsFetchFailure) {
                    window.__lastLyricsFetchFailure = now;
                } else if (now - window.__lastLyricsFetchFailure < 120000) { // 2 minutes
                    window.__lastLyricsFetchFailure = null;
                    return null;
                } else {
                    window.__lastLyricsFetchFailure = now;
                }
                return null;
            }

            store.lyricsInfo = newLyricsInfo;

            updateLyrics(store.track!.id, newLyricsInfo.lyricsVersions[e.provider], e.provider);

            store.emitChange();
        }
    });
    return store;
});

