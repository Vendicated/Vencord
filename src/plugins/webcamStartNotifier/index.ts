/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, SelectedChannelStore } from "@webpack/common";

const startSound = "https://raw.githubusercontent.com/redbaron2k7/videoStartNotifier/117738bff76699a89531a067e321b6406bffbc88/start.mp3";
const stopSound = "https://raw.githubusercontent.com/redbaron2k7/videoStartNotifier/117738bff76699a89531a067e321b6406bffbc88/stop.mp3";

const videoStates = new Map<string, boolean>();

function playNotification(isVideoOn: boolean) {
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
        return {
            VOICE_STATE_UPDATES: ({ voiceStates }: { voiceStates: Array<{ userId: string, channelId: string, selfVideo?: boolean; }>; }) => {
                const currentChannelId = SelectedChannelStore.getVoiceChannelId();
                if (!currentChannelId) return;

                const currentChannel = ChannelStore.getChannel(currentChannelId);
                if (!currentChannel) return;

                const isPrivateChannel = currentChannel.type === 1 || currentChannel.type === 3;

                if ((isPrivateChannel && !settings.store.playInPrivate) ||
                    (!isPrivateChannel && !settings.store.playInServer)) {
                    return;
                }

                voiceStates.forEach(state => {
                    if (state.channelId !== currentChannelId) return;

                    const prevVideoState = videoStates.get(state.userId);
                    if (state.selfVideo !== undefined && prevVideoState !== undefined && prevVideoState !== state.selfVideo) {
                        playNotification(state.selfVideo);
                    }
                    videoStates.set(state.userId, state.selfVideo ?? false);
                });
            }
        };
    })(),
});
