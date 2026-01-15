/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showToast, ToastPosition, ToastType } from "@webpack/common";
import { findByCodeLazy } from "webpack";

import { settings } from "./settings";
import { ApplicationStreamingStore, MediaEngineStore, RTCConnectionStore, RunningGameStore, StreamRTCConnectionStore } from "./stores";

type StreamOptions = {
    audioSourceId: string | null;
    goLiveModalDurationMs: number;
    nativePickerStyleUsed: boolean | undefined;
    pid: number | null;
    previewDisabled: boolean;
    sound: boolean;
    sourceId: string | null;
    sourceName: string | null;
};

type StreamStartParameters = {
    streamGuildId: string | null;
    streamChannelId: string | null;
    streamOptions: StreamOptions | null;
};

const startParameters: StreamStartParameters = {
    streamGuildId: null,
    streamChannelId: null,
    streamOptions: null
};

const streamStart = findByCodeLazy('type:"STREAM_START"');
const streamStop = findByCodeLazy('type:"STREAM_STOP"');

function showToastCheck(message: string, type = ToastType.MESSAGE) {
    if (!settings.store.showToast) return;
    showToast(message, type, { position: ToastPosition.BOTTOM });
}

type ActiveStream = {
    streamType: string;
    guildId: string | null;
    channelId: string;
    ownerId: string;
} | null;

function getActiveStreamKey() {
    const activeStream = ApplicationStreamingStore.getCurrentUserActiveStream() as ActiveStream;
    if (activeStream) {
        if (activeStream.guildId) {
            return activeStream.streamType + ":" + activeStream.guildId + ":" + activeStream.channelId + ":" + activeStream.ownerId;
        } else {
            return activeStream.streamType + ":" + activeStream.channelId + ":" + activeStream.ownerId;
        }
    }
    return null;
}

function isStreamingWindow() {
    const streamkey = getActiveStreamKey();
    if (streamkey === null) return false;
    const streamSource = StreamRTCConnectionStore.getStreamSourceId(streamkey);
    if (streamSource) {
        return streamSource.startsWith("window");
    }
    return false;
}

export async function getPreviews(functionName: "getScreenPreviews" | "getWindowPreviews", width = 376, height = 212) {
    const mediaEngine = MediaEngineStore.getMediaEngine();
    const previews = await mediaEngine[functionName](width, height) as Array<StreamSource>;
    if (functionName === "getScreenPreviews") {
        settings.store.displayNumber = previews.length;
    }
    return previews;
}

export async function startStream() {
    startParameters.streamChannelId = RTCConnectionStore.getChannelId();
    startParameters.streamGuildId = RTCConnectionStore.getGuildId(startParameters.streamChannelId);
    const activeStream = ApplicationStreamingStore.getCurrentUserActiveStream();
    if (activeStream) {
        showToastCheck("You are already streaming!", ToastType.MESSAGE);
    } else if (startParameters.streamChannelId) {
        await initializeStreamSetting();
        streamStart(startParameters.streamGuildId, startParameters.streamChannelId, startParameters.streamOptions);
        showToastCheck("Screenshare started!", ToastType.SUCCESS);
    } else {
        showToastCheck("No active call to start screenshare!", ToastType.FAILURE);
    }
}

export async function stopStream() {
    const streamkey = getActiveStreamKey();
    if (streamkey) {
        streamStop(streamkey);
        startParameters.streamChannelId = null;
        startParameters.streamGuildId = null;
        startParameters.streamOptions = null;
        showToastCheck("Screenshare stopped!", ToastType.MESSAGE);
    } else {
        showToastCheck("No active screenshare to stop!", ToastType.MESSAGE);
    }
}

export async function toggleGameOrScreen() {
    await updateStreamSetting();
    updateStream();
    showToastCheck(`Switched to ${!isStreamingWindow() ? "screen" : "game"} sharing!`, ToastType.MESSAGE);
}

export function toggleStream() {
    if (ApplicationStreamingStore.getCurrentUserActiveStream()) {
        stopStream();
    } else {
        startStream();
    }
}

export function toggleAudio() {
    if (!startParameters.streamOptions) return;
    settings.store.shareAudio = !settings.store.shareAudio;
    startParameters.streamOptions.sound = settings.store.shareAudio;
    updateStream();
    const updated = updateStream();
    if (updated) {
        showToastCheck(`Audio sharing ${settings.store.shareAudio ? "enabled" : "disabled"}!`, ToastType.MESSAGE);
    } else {
        showToastCheck("No active screenshare to toggle audio!", ToastType.MESSAGE);
    }
}

type StreamSource = {
    icon: string;
    id: string;
    pid?: number;
    name: string;
    url: string;
};

function getStreamOptions(source: StreamSource) {
    return {
        audioSourceId: null,
        goLiveModalDurationMs: 1858,
        nativePickerStyleUsed: undefined,
        pid: source?.pid ? source.pid : null,
        previewDisabled: settings.store.disablePreview,
        sound: settings.store.shareAudio,
        sourceId: source?.id ? source.id : null,
        sourceName: source?.name ? source.name : null,
    };
}

async function initializeStreamSetting() {
    await updateStreamSetting(true);
}

async function updateStreamSetting(firstInit = false) {
    const game = RunningGameStore.getVisibleGame();
    const streamingWindow = isStreamingWindow();
    const streamGame = firstInit ? !settings.store.shareAlwaysScreen && game !== null : !streamingWindow && game !== null;
    let displayIndex = settings.store.displayNumber - 1;
    const screenPreviews = await getPreviews("getScreenPreviews");
    const windowPreviews = await getPreviews("getWindowPreviews");

    if (!streamGame && game && screenPreviews.length === 0) return;
    if (displayIndex >= screenPreviews.length) {
        settings.store.displayNumber = 1;
        displayIndex = 1;
    } else if (displayIndex < 0) {
        settings.store.displayNumber = screenPreviews.length;
        displayIndex = screenPreviews.length - 1;
    }

    const screenPreview = screenPreviews[displayIndex];
    const windowPreview = windowPreviews.find(window => window.id.endsWith(game?.windowHandle));

    startParameters.streamOptions = getStreamOptions(windowPreview && streamGame ? windowPreview : screenPreview);
}

export function updateStream() {
    if (ApplicationStreamingStore.getCurrentUserActiveStream() && startParameters.streamGuildId && startParameters.streamChannelId && startParameters.streamOptions) {
        streamStart(startParameters.streamGuildId, startParameters.streamChannelId, startParameters.streamOptions);
        return true;
    } else {
        return false;
    }
}
