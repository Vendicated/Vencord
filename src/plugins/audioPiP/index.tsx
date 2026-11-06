/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { createRoot } from "@webpack/common";
import type { Root } from "react-dom/client";

import { getNativeAudios, nativeAudioPatches, nativeAudioPlayerRef, storeVoicePosition, subscribeNativeAudio, useNativeVoiceAudio } from "./discordAudio";
import { resolveTrack } from "./media";
import { PiPWindow } from "./PiPWindow";
import { destroyPlayer, detachNativeTrack, onNativePlay, playerStore, restoreNativeTrack, syncPlaybackRate } from "./player";
import { settings } from "./settings";
import managedStyle from "./style.css?managed";

export default definePlugin({
    name: "AudioPiP",
    description: "Keeps audio files and voice messages playing in a floating player when you leave the channel",
    tags: ["Media", "Utility"],
    authors: [Devs.OKISO],
    settings,
    managedStyle,
    patches: nativeAudioPatches,
    nativeAudioPlayerRef,
    useNativeVoiceAudio,

    root: null as Root | null,
    container: null as HTMLDivElement | null,
    unsubscribeNative: null as (() => void) | null,
    unsubscribePlayer: null as (() => void) | null,

    flux: {
        MEDIA_PLAYBACK_RATE_UPDATE({ playbackType, rate }: { playbackType: string; rate: number; }) {
            if (playbackType === "voice_message" && playerStore.getState().track?.playbackCacheKey)
                syncPlaybackRate(rate);
        }
    },

    start() {
        this.unsubscribeNative = subscribeNativeAudio({
            play: audio => onNativePlay(audio, resolveTrack(audio)),
            attach: audio => restoreNativeTrack(audio, resolveTrack(audio)),
            detach: (audio, snapshot) => detachNativeTrack(audio, resolveTrack(audio), snapshot, settings.store.alwaysShow, this.container)
        });
        const playing = getNativeAudios().find(audio => !audio.element.paused && !audio.element.ended);
        if (playing) onNativePlay(playing, resolveTrack(playing));
        this.unsubscribePlayer = playerStore.subscribe(() => {
            const { track, isDetached, currentTime, duration } = playerStore.getState();
            if (isDetached && track?.playbackCacheKey) storeVoicePosition(track.playbackCacheKey, currentTime, duration);
        });

        this.container = document.createElement("div");
        this.container.id = "vc-audio-pip-root";
        document.body.appendChild(this.container);

        const view = this.container.appendChild(document.createElement("div"));
        this.root = createRoot(view);
        this.root.render(
            <ErrorBoundary noop>
                <PiPWindow />
            </ErrorBoundary>
        );
    },

    stop() {
        this.unsubscribeNative?.();
        this.unsubscribeNative = null;
        this.unsubscribePlayer?.();
        this.unsubscribePlayer = null;

        this.root?.unmount();
        this.root = null;
        this.container?.remove();
        this.container = null;

        destroyPlayer();
    }
});
