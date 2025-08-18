/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showToast, ToastOptions, ToastPosition, ToastType } from "@webpack/common";
import { findByCodeLazy } from "webpack";

import { settings } from "./settings";
import { ApplicationStreamingStore, MediaEngineStore, RTCConnectionStore, RunningGameStore, StreamRTCConnectionStore } from "./stores";

const startParameters = {
    streamGuildId: null,
    streamChannelId: null,
    streamOptions: {
        audioSourceId: null,
        goLiveModalDurationMs: 2000,
        nativePickerStyleUsed: undefined,
        pid: null,
        previewDisabled: false,
        sound: true,
        sourceId: null,
        sourceName: null,
    }
};

const startStream = findByCodeLazy('type:"STREAM_START"');
const stopStream = findByCodeLazy('type:"STREAM_STOP"');

export async function startStreaming() {
    await initializeStreamSetting();
    startStream(startParameters.streamGuildId, startParameters.streamChannelId, startParameters.streamOptions);
    showToastCheck("Screenshare started!", ToastType.SUCCESS);
}

export function stopStreaming() {
    const streamkey = getActiveStreamKey();
    if (streamkey === null) return;
    stopStream(streamkey);
    startParameters.streamChannelId = null;
    startParameters.streamGuildId = null;
    startParameters.streamOptions = getStreamOptions(null);
    showToastCheck("Screenshare stopped!", ToastType.FAILURE);
}

export async function toggleGameOrScreen() {
    await updateStreamSetting();
    updateStream();
    showToastCheck(`Switched to ${isStreamingWindow() ? "screen" : "game"} sharing!`);
}

export function toggleAudio() {
    settings.store.shareAudio = !settings.store.shareAudio;
    startParameters.streamOptions.sound = settings.store.shareAudio;
    updateStream();
    showToastCheck(`Audio sharing ${settings.store.shareAudio ? "enabled" : "disabled"}!`);
}

export function toggleStream() {
    if (ApplicationStreamingStore.getCurrentUserActiveStream()) {
        stopStreaming();
    } else {
        startStreaming();
    }
}

function getActiveStreamKey() {
    const activeStream = ApplicationStreamingStore.getCurrentUserActiveStream();
    if (activeStream) {
        return activeStream.streamType + ":" + activeStream.guildId + ":" + activeStream.channelId + ":" + activeStream.ownerId;
    }
    return null;
}

function isStreamingWindow() {
    const streamkey = getActiveStreamKey();
    if (streamkey === null) return false;
    const streamSource = StreamRTCConnectionStore.getStreamSourceId(streamkey);
    return streamSource === null || streamSource.startsWith("window");
}

async function getPreviews(functionName, width = 376, height = 212) {
    const mediaEngine = MediaEngineStore.getMediaEngine();
    const previews = await mediaEngine[functionName](width, height);
    if (functionName === "getScreenPreviews") {
        settings.store.displayNumber = previews.length;
    }
    return previews;
}

function getStreamOptions(surce) {
    return {
        audioSourceId: null,
        goLiveModalDurationMs: 1858,
        nativePickerStyleUsed: undefined,
        pid: surce?.pid ? surce.pid : null,
        previewDisabled: settings.store.disablePreview,
        sound: settings.store.shareAudio,
        sourceId: surce?.id ? surce.id : null,
        sourceName: surce?.name ? surce.name : null,
    };
}

async function initializeStreamSetting() {
    await updateStreamSetting(true);
}

async function updateStreamSetting(firstInit = false) {
    const game = RunningGameStore.getVisibleGame();
    const streamGame = firstInit ? !settings.store.shareAlwaysScreen && game !== null : !isStreamingWindow() && game !== null;
    let displayIndex = settings.store.displayNumber - 1;
    const screenPreviews = await getPreviews("getScreenPreviews");
    const windowPreviews = await getPreviews("getWindowPreviews");

    if (!streamGame && game && screenPreviews.length === 0) return;
    if (displayIndex >= screenPreviews.length) {
        settings.store.displayNumber = 1;
        displayIndex = 1;
    }

    const screenPreview = screenPreviews[displayIndex];
    const windowPreview = windowPreviews.find(window => window.id.endsWith(game?.windowHandle));

    startParameters.streamChannelId = RTCConnectionStore.getChannelId();
    startParameters.streamGuildId = RTCConnectionStore.getGuildId(startParameters.streamChannelId);

    startParameters.streamOptions = getStreamOptions(windowPreview && streamGame ? windowPreview : screenPreview);
}

export function updateStream() {
    if (ApplicationStreamingStore.getCurrentUserActiveStream()) {
        startStream(startParameters.streamGuildId, startParameters.streamChannelId, startParameters.streamOptions);
    }
}

function showToastCheck(message: string, type = ToastType.MESSAGE) {
    if (!settings.store.showToast) return;
    showToast(message, type, { position: ToastPosition.BOTTOM });
}
