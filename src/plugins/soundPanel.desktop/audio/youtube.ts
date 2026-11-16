/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    findLibrarySong,
    findPendingSong,
    getPendingSong,
    type LibraryItem,
    nativeReason,
    type PendingSong,
    prepareYouTube,
    refreshLibrary,
    removePendingSong,
    setPendingSong
} from "@plugins/soundPanel.desktop/data/library";
import { showError } from "@plugins/soundPanel.desktop/utils/logger";
import { Native } from "@plugins/soundPanel.desktop/utils/native";
import { youTubeVideoId } from "@plugins/soundPanel.desktop/utils/youtube";
import { showToast } from "@webpack/common";

import { musicStore, playTrack } from "./player";

export type YouTubePreview = Awaited<ReturnType<NonNullable<typeof Native>["getYouTubePreview"]>>;

const previews = new Map<string, Promise<YouTubePreview>>();

export function loadYouTubePreview(videoId: string) {
    let preview = previews.get(videoId);
    if (!preview) {
        preview = Native!.getYouTubePreview(`https://www.youtube.com/watch?v=${videoId}`);
        preview.then(
            ({ video }) => {
                if (!video.found && video.reason === "unreachable") previews.delete(videoId);
            },
            () => previews.delete(videoId)
        );
        previews.set(videoId, preview);
    }
    return preview;
}

const POLL_INTERVAL = 400;
const FULL_BAR_PAUSE = 800;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const starting = new Set<string>();
let playRequest: { id: string; currentId: string | null; } | null = null;

function claimPlayRequest(id: string) {
    if (playRequest?.id !== id) return false;

    const stillWanted = musicStore.get().currentId === playRequest.currentId;
    playRequest = null;
    return stillWanted;
}

function requestPlay(id: string) {
    playRequest = { id, currentId: musicStore.get().currentId };
}

export function playPendingSong(id: string) {
    if (!getPendingSong(id)) return;

    requestPlay(id);
    showToast({ text: "It plays as soon as it's downloaded" });
}

export async function cancelPendingSong(id: string) {
    const song = getPendingSong(id);
    if (!song || song.progress === 1) return;

    if (playRequest?.id === id) playRequest = null;
    removePendingSong(id);
    try {
        await Native!.cancelYouTubeDownload(id);
        showToast({ text: `Cancelled "${song.name}"` });
    } catch (err) {
        showError(`Couldn't cancel "${song.name}"`, err);
    } finally {
        void Native!.finishYouTubeDownload(id);
    }
}

function giveUp(id: string, reason: string) {
    if (playRequest?.id === id) playRequest = null;
    removePendingSong(id);
    void Native!.finishYouTubeDownload(id);
    showError(`Couldn't add it from YouTube: ${reason}`, new Error(reason));
}

async function followDownload(id: string) {
    const native = Native!;

    for (;;) {
        await sleep(POLL_INTERVAL);
        if (!getPendingSong(id)) return;

        let state: Awaited<ReturnType<typeof native.getYouTubeDownload>>;
        try {
            state = await native.getYouTubeDownload(id);
        } catch (err) {
            return giveUp(id, nativeReason(err));
        }

        const song = getPendingSong(id);
        if (!song) return;
        if (!state) return giveUp(id, "The download stopped");
        if (state.error) return giveUp(id, state.error);

        setPendingSong({
            ...song,
            name: state.title || song.name,
            artist: state.channel || song.artist,
            cover: state.cover,
            duration: state.duration || song.duration,
            progress: state.progress,
            queued: state.queued
        });

        const { item } = state;
        if (item) {
            await sleep(FULL_BAR_PAUSE);
            await refreshLibrary();
            removePendingSong(id);
            void native.finishYouTubeDownload(id);
            showToast({ text: `Added "${item.name}" to Music`, variant: "success" });

            if (claimPlayRequest(id)) playTrack(id).catch(err => showError(`Couldn't play "${item.name}"`, err));
            return;
        }
    }
}

export type YouTubeResult = { item: LibraryItem; } | { song: PendingSong; };

export async function playFromYouTube(link: string): Promise<YouTubeResult> {
    if (!Native) throw new Error("YouTube links need the Discord desktop app");

    const videoId = youTubeVideoId(link);
    if (!videoId) throw new Error("That isn't a link to a YouTube video");

    await refreshLibrary();
    const item = findLibrarySong(videoId);
    if (item) return { item };

    const pending = findPendingSong(videoId);
    if (pending) {
        playPendingSong(pending.id);
        return { song: pending };
    }
    if (starting.has(videoId)) throw new Error("That link is already on its way");

    starting.add(videoId);
    try {
        await prepareYouTube();
        const id = await Native.startYouTubeDownload(link);

        const song: PendingSong = {
            id,
            youtubeId: videoId,
            name: "Loading from YouTube...",
            cover: false,
            duration: 0,
            progress: null,
            queued: false
        };
        setPendingSong(song);
        requestPlay(id);
        void followDownload(id);

        return { song };
    } catch (err) {
        throw new Error(nativeReason(err), { cause: err });
    } finally {
        starting.delete(videoId);
    }
}
