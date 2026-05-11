/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, Toasts } from "@webpack/common";

const VoiceStateStore = findByPropsLazy("getVoiceStatesForChannel");
const ChannelActions = findByPropsLazy("selectVoiceChannel", "disconnect");

// =====================
//       STATE
// =====================
// Set of all queued channel IDs
const queuedChannels = new Set<string>();
let originalSelectVoiceChannel: ((...args: any[]) => any) | null = null;

// =====================
//     HELPERS
// =====================
function getChannelUserCount(channelId: string): number {
    const channel = ChannelStore.getChannel(channelId);
    const states = VoiceStateStore.getVoiceStatesForChannel(channel);
    return states ? Object.keys(states).length : 0;
}

function getChannelLimit(channelId: string): number {
    const channel = ChannelStore.getChannel(channelId);
    return (channel as any)?.userLimit ?? 0;
}

function isChannelFull(channelId: string): boolean {
    const limit = getChannelLimit(channelId);
    if (limit === 0) return false;
    return getChannelUserCount(channelId) >= limit;
}

function getChannelName(channelId: string): string {
    const channel = ChannelStore.getChannel(channelId);
    return (channel as any)?.name ?? channelId;
}

function addToQueue(channelId: string) {
    if (queuedChannels.has(channelId)) {
        // Already queued — notify user
        Toasts.show({
            message: `⏳ Already queued for "${getChannelName(channelId)}"!`,
            type: Toasts.Type.MESSAGE,
            id: Toasts.genId(),
        });
        return;
    }

    queuedChannels.add(channelId);

    Toasts.show({
        message: `⏳ Queued for "${getChannelName(channelId)}" (${queuedChannels.size} in queue)`,
        type: Toasts.Type.MESSAGE,
        id: Toasts.genId(),
    });
}

function removeFromQueue(channelId: string) {
    queuedChannels.delete(channelId);
}

function clearQueue() {
    queuedChannels.clear();
}

// =====================
//    VOICE STATE HANDLER
// =====================
function handleVoiceStateUpdates(event: any) {
    if (queuedChannels.size === 0) return;
    if (!event?.voiceStates) return;

    for (const state of event.voiceStates) {
        const leftChannelId = state.oldChannelId;

        // Check if someone left one of our queued channels
        if (leftChannelId && queuedChannels.has(leftChannelId) && state.channelId !== leftChannelId) {
            setTimeout(() => {
                if (!queuedChannels.has(leftChannelId)) return;

                if (!isChannelFull(leftChannelId)) {
                    removeFromQueue(leftChannelId);

                    // Clear all other queues since we're joining now
                    clearQueue();

                    originalSelectVoiceChannel?.call(ChannelActions, leftChannelId);

                    Toasts.show({
                        message: `✅ Joined "${getChannelName(leftChannelId)}"!`,
                        type: Toasts.Type.SUCCESS,
                        id: Toasts.genId(),
                    });
                }
            }, 300);

            break; // Join the first available channel only
        }
    }
}

// =====================
//      PLUGIN
// =====================
export default definePlugin({
    name: "VCQueue",
    description: "Queue for multiple full voice channels — joins the first one that opens!",
    authors: [{ name: "You", id: 0n }],

    patches: [],

    start() {
        originalSelectVoiceChannel = ChannelActions.selectVoiceChannel;

        ChannelActions.selectVoiceChannel = function (channelId: string, ...args: any[]) {
            if (channelId && isChannelFull(channelId)) {
                addToQueue(channelId);
                return; // Block Discord's "channel full" popup
            }

            // Joining a channel normally — clear all queues
            clearQueue();
            return originalSelectVoiceChannel?.call(this, channelId, ...args);
        };

        FluxDispatcher.subscribe("VOICE_STATE_UPDATES", handleVoiceStateUpdates);
    },

    stop() {
        if (originalSelectVoiceChannel) {
            ChannelActions.selectVoiceChannel = originalSelectVoiceChannel;
            originalSelectVoiceChannel = null;
        }
        FluxDispatcher.unsubscribe("VOICE_STATE_UPDATES", handleVoiceStateUpdates);
        clearQueue();
    },
});
