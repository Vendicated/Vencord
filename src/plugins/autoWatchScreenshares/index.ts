/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { ApplicationStreamingStore, FluxDispatcher, RelationshipStore, UserStore, VoiceStateStore } from "@webpack/common";

const settings = definePluginSettings({
    friendsOnly: {
        type: OptionType.BOOLEAN,
        description: "Only start watching the screen of people you are friends with",
        default: true
    },
    maxStreams: {
        type: OptionType.SLIDER,
        description: "The maximum amount of streams to watch",
        markers: makeRange(1, 10, 1),
        stickToMarkers: true,
        default: 5
    }
});

interface VoiceStateChangeEvent {
    userId: string;
    channelId?: string;
    guildId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    sessionId: string;
}

const ignoredStreams = new Set<string>();

function getStreamKey(stream: any, guildId: string, channelId: string) {
    return stream.streamType === "guild"
        ? `guild:${guildId}:${channelId}:${stream.ownerId}`
        : `call:${channelId}:${stream.ownerId}`;
}

function watchStreams(channelId: string, guildId: string) {
    const activeStreams = ApplicationStreamingStore.getAllActiveStreamsForChannel(channelId);
    const streams = ApplicationStreamingStore.getAllApplicationStreamsForChannel(channelId);

    const currentKeys = new Set<string>();
    let watchedCount = 0;

    for (const stream of streams) {
        const streamKey = getStreamKey(stream, guildId, channelId);
        currentKeys.add(streamKey);

        if (activeStreams.some(s => s.ownerId === stream.ownerId)) {
            watchedCount++;
            continue;
        }

        if (ignoredStreams.has(streamKey)) continue;
        if (watchedCount >= settings.store.maxStreams) break;
        if (settings.store.friendsOnly && !RelationshipStore.isFriend(stream.ownerId)) continue;

        FluxDispatcher.dispatch({
            type: "STREAM_WATCH",
            streamKey,
            allowMultiple: true
        });

        watchedCount++;
    }

    for (const key of ignoredStreams) {
        if (!currentKeys.has(key)) {
            ignoredStreams.delete(key);
        }
    }
}

export default definePlugin({
    name: "AutoWatchScreenshares",
    description: "Automatically watches screenshares when joining a voice channel or a screenshare starts",
    authors: [Devs.theo],
    settings,

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceStateChangeEvent[]; }) {
            const currentUser = UserStore.getCurrentUser();
            const currentVoice = VoiceStateStore.getVoiceStateForUser(currentUser.id);

            if (!currentVoice?.channelId) return;
            for (const state of voiceStates) {
                if (state.channelId !== currentVoice.channelId) continue;

                watchStreams(state.channelId, state.guildId!);
            }
        },

        STREAM_DELETE({ streamKey, reason }: { streamKey: string; reason: string; }) {
            if (reason === "user_requested") {
                ignoredStreams.add(streamKey);
            }
        }
    }
});
