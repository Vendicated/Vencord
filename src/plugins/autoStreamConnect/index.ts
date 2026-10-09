/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { ApplicationStream } from "@vencord/discord-types";
import {
    ApplicationStreamingStore,
    ChannelStore,
    FluxDispatcher,
    RTCConnectionStore,
    SelectedChannelStore,
    UserStore
} from "@webpack/common";

const RETRY_INTERVAL = 500;
const MAX_RETRIES = 20;

const settings = definePluginSettings({
    focus: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Bring the latest stream into the main call view "
    },
    disconnectOtherStreams: {
        type: OptionType.BOOLEAN,
        default: false,
        displayName: "Disconnect other streams",
        description: "Stop watching previous streams when switching to a new stream"
    }
});

interface StreamKeyEvent {
    streamKey?: string;
}

interface StreamInfo {
    channelId: string;
    ownerId: string;
}

const requestedStreams = new Set<string>();
const watchRetries = new Map<string, ReturnType<typeof setTimeout>>();
const scanRetries = new Map<string, ReturnType<typeof setTimeout>>();
let enabled = false;

function parseStreamKey(streamKey: string): StreamInfo | undefined {
    const parts = streamKey.split(":");

    if (parts[0] === "guild" && parts.length === 4)
        return { channelId: parts[2], ownerId: parts[3] };

    if (parts[0] === "call" && parts.length === 3)
        return { channelId: parts[1], ownerId: parts[2] };
}

function getStreamKey({ guildId, channelId, ownerId }: ApplicationStream) {
    return guildId
        ? `guild:${guildId}:${channelId}:${ownerId}`
        : `call:${channelId}:${ownerId}`;
}

function watchStream(streamKey: string, retries = 0) {
    if (!enabled || !requestedStreams.has(streamKey)) return;

    const stream = parseStreamKey(streamKey);
    const currentUser = UserStore.getCurrentUser();
    if (
        !stream ||
        !currentUser ||
        stream.ownerId === currentUser.id ||
        !ChannelStore.getChannel(stream.channelId) ||
        SelectedChannelStore.getVoiceChannelId() !== stream.channelId
    ) {
        requestedStreams.delete(streamKey);
        return;
    }

    if (!RTCConnectionStore.isConnected()) {
        if (retries >= MAX_RETRIES) {
            requestedStreams.delete(streamKey);
            return;
        }

        watchRetries.set(streamKey, setTimeout(() => {
            watchRetries.delete(streamKey);
            watchStream(streamKey, retries + 1);
        }, RETRY_INTERVAL));
        return;
    }

    FluxDispatcher.dispatch({
        type: "STREAM_WATCH",
        streamKey,
        allowMultiple: !settings.store.disconnectOtherStreams
    });

    if (settings.store.focus) {
        FluxDispatcher.dispatch({
            type: "CHANNEL_RTC_SELECT_PARTICIPANT",
            channelId: stream.channelId,
            id: streamKey
        });
    }
}

function requestWatch(streamKey: string, deferUntilDispatchEnds = false) {
    if (!enabled || requestedStreams.has(streamKey)) return;
    requestedStreams.add(streamKey);

    const startWatch = () => watchStream(streamKey);
    if (deferUntilDispatchEnds)
        FluxDispatcher.wait(startWatch);
    else
        startWatch();
}

function scanChannel(channelId: string, retries = 0) {
    if (!enabled || SelectedChannelStore.getVoiceChannelId() !== channelId) return;

    if (!RTCConnectionStore.isConnected()) {
        if (retries >= MAX_RETRIES) return;
        if (scanRetries.has(channelId)) return;

        scanRetries.set(channelId, setTimeout(() => {
            scanRetries.delete(channelId);
            scanChannel(channelId, retries + 1);
        }, RETRY_INTERVAL));
        return;
    }

    for (const stream of ApplicationStreamingStore.getAllApplicationStreamsForChannel(channelId))
        requestWatch(getStreamKey(stream));
}

function onStreamCreate({ streamKey }: StreamKeyEvent) {
    if (streamKey) requestWatch(streamKey, true);
}

function onStreamDelete({ streamKey }: StreamKeyEvent) {
    if (!streamKey) return;

    requestedStreams.delete(streamKey);
    clearTimeout(watchRetries.get(streamKey));
    watchRetries.delete(streamKey);

    const stream = parseStreamKey(streamKey);
    if (!stream || stream.ownerId === UserStore.getCurrentUser()?.id) return;

    // This is the same action Discord's ended-stream "Close stream" button uses.
    FluxDispatcher.wait(() => {
        if (!enabled) return;
        FluxDispatcher.dispatch({
            type: "STREAM_CLOSE",
            streamKey,
            canShowFeedback: false
        });
    });
}

function onVoiceChannelSelect({ channelId }: { channelId?: string | null; }) {
    if (channelId)
        FluxDispatcher.wait(() => scanChannel(channelId));
}

function onVoiceStateUpdates({ voiceStates }: { voiceStates?: Array<{ channelId?: string | null; selfStream?: boolean; }>; }) {
    const channelId = SelectedChannelStore.getVoiceChannelId();
    if (channelId && voiceStates?.some(state => state.channelId === channelId && state.selfStream))
        FluxDispatcher.wait(() => scanChannel(channelId));
}

function clearTimers(timers: Map<string, ReturnType<typeof setTimeout>>) {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
}

export default definePlugin({
    name: "AutoStreamConnect",
    description: "Automatically connects to a stream when someone starts streaming in the current voice channel",
    tags: ["Voice", "Utility"],
    authors: [Devs.torridhorror],
    settings,
    start() {
        enabled = true;
        const channelId = SelectedChannelStore.getVoiceChannelId();
        if (channelId) scanChannel(channelId);
    },
    stop() {
        enabled = false;
        requestedStreams.clear();
        clearTimers(watchRetries);
        clearTimers(scanRetries);
    },
    flux: {
        STREAM_CREATE: onStreamCreate,
        STREAM_DELETE: onStreamDelete,
        VOICE_CHANNEL_SELECT: onVoiceChannelSelect,
        VOICE_STATE_UPDATES: onVoiceStateUpdates
    }
});
