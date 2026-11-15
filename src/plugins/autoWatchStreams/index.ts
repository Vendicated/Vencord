/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import type { ApplicationStream } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { ApplicationStreamingStore, SelectedChannelStore, UserStore, VoiceStateStore } from "@webpack/common";

// Discord's native watch action, including its permission/remote-session checks
// and participant selection. Do not substitute gateway messages for this action.
const watchStream = findByCodeLazy('type:"STREAM_WATCH"', "forceMultiple") as (
    stream: ApplicationStream,
    options: { forceMultiple: boolean; noFocus: boolean; }
) => void;

const logger = new Logger("AutoWatchStreams");
const settings = definePluginSettings({
    userIds: {
        type: OptionType.STRING,
        description: "Only watch these user IDs (comma or space separated). Leave blank for everyone in your call.",
        default: ""
    },
    watchExistingStreams: {
        type: OptionType.BOOLEAN,
        description: "Also watch streams that are already live when you join a call or enable the plugin.",
        default: true
    },
    onlyWhenNotWatching: {
        type: OptionType.BOOLEAN,
        description: "Skip new streams while you are already watching another stream.",
        default: true
    },
    skipWhenDeafened: {
        type: OptionType.BOOLEAN,
        description: "Skip automatic watching while self-deafened or server-deafened.",
        default: true
    },
    focusStream: {
        type: OptionType.BOOLEAN,
        description: "Focus the stream inside Discord when automatic watching starts.",
        default: true
    },
    delaySeconds: {
        type: OptionType.SLIDER,
        description: "Seconds to wait before watching a newly started stream.",
        markers: [0.5, 1, 1.5, 2, 3, 5],
        default: 1.5,
        stickToMarkers: true
    }
});

type Timer = ReturnType<typeof setTimeout>;
let running = false;
let channelId: string | undefined;
let seen = new Set<string>();
const pending = new Map<string, Timer>();
let scanTimer: Timer | undefined;
let lastWatchAttempt = -Infinity;
let warned = false;

function streamKey(stream: ApplicationStream): string {
    return stream.streamType === "guild"
        ? `guild:${stream.guildId}:${stream.channelId}:${stream.ownerId}`
        : `call:${stream.channelId}:${stream.ownerId}`;
}

function clearPending() {
    for (const timer of pending.values()) clearTimeout(timer);
    pending.clear();
}

function reportFailure(error: unknown) {
    logger.error("Could not auto-watch a stream", error);
    if (warned) return;
    warned = true;
    void showNotification({
        title: "AutoWatchStreams needs attention",
        body: "Discord's stream interface may have changed. Watch manually and check the console for AutoWatchStreams errors.",
        noPersist: true
    }).catch(error => logger.error("Could not show notification", error));
}

function attemptWatch(key: string, expectedChannel: string) {
    pending.delete(key);
    if (!running || SelectedChannelStore.getVoiceChannelId() !== expectedChannel) return;

    try {
        const me = UserStore.getCurrentUser()?.id;
        if (!me || !VoiceStateStore.isInChannel(expectedChannel, me)) return;
        const stream = ApplicationStreamingStore.getAllApplicationStreamsForChannel(expectedChannel)
            .find(stream => streamKey(stream) === key);
        if (!stream || stream.ownerId === me) return;

        const allowed = settings.store.userIds.trim().split(/[\s,;]+/).filter(Boolean);
        if (allowed.length && !allowed.includes(stream.ownerId)) return;
        const voice = VoiceStateStore.getVoiceStateForChannel(expectedChannel, me);
        if (settings.store.skipWhenDeafened && (voice?.selfDeaf || voice?.deaf)) return;
        if (ApplicationStreamingStore.isStreamMarkedFull(key)) return;

        const active = ApplicationStreamingStore.getAllActiveStreamsForChannel(expectedChannel);
        if (active.some(stream => streamKey(stream) === key)) return;
        if (settings.store.onlyWhenNotWatching) {
            if (active.some(stream => stream.ownerId !== me)) return;
            // Cover two starts in the same tick before Discord updates its store.
            if (Date.now() - lastWatchAttempt < 3000) return;
        }

        lastWatchAttempt = Date.now();
        watchStream(stream, {
            forceMultiple: !settings.store.onlyWhenNotWatching,
            noFocus: !settings.store.focusStream
        });
    } catch (error) {
        reportFailure(error);
    }
}

function scan() {
    if (!running) return;
    try {
        const current = SelectedChannelStore.getVoiceChannelId();
        const streams = current
            ? ApplicationStreamingStore.getAllApplicationStreamsForChannel(current)
            : [];
        const keys = new Set(streams.map(streamKey));

        if (current !== channelId) {
            clearPending();
            channelId = current;
            lastWatchAttempt = -Infinity;
            if (!settings.store.watchExistingStreams) {
                seen = keys;
                return; // Existing streams are left alone when entering a channel.
            }
            seen = new Set(); // Treat streams already live in the new channel as new.
        }

        for (const [key, timer] of pending) {
            if (!keys.has(key)) {
                clearTimeout(timer);
                pending.delete(key);
            }
        }

        const previous = seen;
        seen = keys; // Mark before scheduling; closing a stream will not reopen it.
        const me = UserStore.getCurrentUser()?.id;
        if (!current || !me) return;
        for (const stream of streams) {
            const key = streamKey(stream);
            if (previous.has(key) || stream.ownerId === me) continue;
            const delay = Math.max(500, Math.min(5000, settings.store.delaySeconds * 1000));
            pending.set(key, setTimeout(() => attemptWatch(key, current), delay));
        }
    } catch (error) {
        reportFailure(error);
    }
}

function scheduleScan() {
    if (!running || scanTimer !== undefined) return;
    // Wait until Flux finishes updating all stores before reading them.
    scanTimer = setTimeout(() => {
        scanTimer = undefined;
        scan();
    }, 0);
}

export default definePlugin({
    name: "AutoWatchStreams",
    description: "Automatically watch new screen shares in your current voice channel or DM call.",
    authors: [Devs.uBlue],
    settings,
    start() {
        if (running) return;
        running = true;
        warned = false;
        channelId = undefined;
        seen.clear();
        lastWatchAttempt = -Infinity;
        ApplicationStreamingStore.addChangeListener(scheduleScan);
        SelectedChannelStore.addChangeListener(scheduleScan);
        scan();
    },
    stop() {
        running = false;
        ApplicationStreamingStore.removeChangeListener(scheduleScan);
        SelectedChannelStore.removeChangeListener(scheduleScan);
        if (scanTimer !== undefined) clearTimeout(scanTimer);
        scanTimer = undefined;
        clearPending();
        seen.clear();
        channelId = undefined;
    }
});
