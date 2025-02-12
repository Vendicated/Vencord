/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { ChannelStore, SelectedChannelStore } from "@webpack/common";

interface VoiceState {
    userId: string;
    channelId: string;
    selfVideo: boolean;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    selfStream: boolean;
    sessionId: string;
    suppress: boolean;
    requestToSpeakTimestamp: number | null;
}

interface VoiceStateUpdate {
    voiceStates: Array<{
        userId: string;
        channelId: string;
        selfVideo?: boolean;
    }>;
}

const startSound = "https://raw.githubusercontent.com/redbaron2k7/videoStartNotifier/117738bff76699a89531a067e321b6406bffbc88/start.mp3";
const stopSound = "https://raw.githubusercontent.com/redbaron2k7/videoStartNotifier/117738bff76699a89531a067e321b6406bffbc88/stop.mp3";

const VoiceStateStore = findStoreLazy("VoiceStateStore");

function playNotification(isVideoOn: boolean): void {
    new Audio(isVideoOn ? startSound : stopSound).play();
}

const settings = definePluginSettings({
    playInPrivate: {
        type: OptionType.BOOLEAN,
        description: "Play notification sound in private voice calls (DMs)",
        default: true
    },
    playInServer: {
        type: OptionType.BOOLEAN,
        description: "Play notification sound in server voice channels",
        default: true
    }
});

export default definePlugin({
    name: "WebcamStartNotifier",
    description: "Plays a sound when someone starts/stops their webcam in a voice channel",
    authors: [Devs.redbaron2k7],
    settings,

    flux: (() => {
        const lastKnownStates = new Map<string, boolean>();

        return {
            VOICE_STATE_UPDATES: ({ voiceStates }: VoiceStateUpdate): void => {
                const currentChannelId = SelectedChannelStore.getVoiceChannelId();
                if (!currentChannelId) return;

                const currentChannel = ChannelStore.getChannel(currentChannelId);
                if (!currentChannel) return;

                const isPrivateChannel = currentChannel.isPrivate();

                if ((isPrivateChannel && !settings.store.playInPrivate) ||
                    (!isPrivateChannel && !settings.store.playInServer)) {
                    return;
                }

                const channelStates = VoiceStateStore.getVoiceStatesForChannel(currentChannelId) as Record<string, VoiceState>;

                voiceStates.forEach(state => {
                    if (!state?.channelId || state.channelId !== currentChannelId) return;

                    const lastKnownState = lastKnownStates.get(state.userId);
                    const currentState = Boolean(state.selfVideo);

                    if (typeof lastKnownState === "boolean" && lastKnownState !== currentState) {
                        playNotification(currentState);
                    }

                    lastKnownStates.set(state.userId, currentState);

                    if (!channelStates[state.userId]) {
                        lastKnownStates.delete(state.userId);
                    }
                });
            }
        };
    })(),
});
