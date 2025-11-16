/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { ChannelStore, FluxDispatcher, UserStore, VoiceStateStore } from "@webpack/common";

const DATASTORE_KEY = "VCLastVoiceChannel";
const DATASTORE_SESSION_KEY = "VCLastVoiceChannelSession";

const settings = definePluginSettings({
    rejoinDelay: {
        type: OptionType.SLIDER,
        description: "Set Delay before rejoining voice channel.",
        markers: makeRange(1, 10, 1),
        default: 2,
        stickToMarkers: true,
    },
    preventReconnectIfCallEnded: {
        type: OptionType.SELECT,
        description: "Do not reconnect if the call has ended or the voice channel is empty or does not exist.",
        options: [
            { label: "None", value: "none", default: false },
            { label: "DMs only", value: "dms", default: false },
            { label: "Servers only", value: "servers", default: false },
            { label: "DMs and Servers", value: "both", default: true },
        ],
    },
});

export default definePlugin({
    name: "VoiceRejoin",
    description: "Rejoins DM/Server call automatically when restarting Discord.",
    authors: [EquicordDevs.omaw],
    settings,

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: any[]; }) {
            const myUserId = UserStore?.getCurrentUser?.()?.id;
            if (!myUserId) return;

            const myState = voiceStates.find(s => s.userId === myUserId);
            if (!myState) return;

            if (myState.channelId) {
                const saved = {
                    guildId: myState.guildId ?? null,
                    channelId: myState.channelId,
                };
                DataStore.set(DATASTORE_KEY, saved);
                DataStore.set(DATASTORE_SESSION_KEY, true);
            } else {
                DataStore.set(DATASTORE_SESSION_KEY, false);
            }
        },

        async CONNECTION_OPEN() {
            const wasInVC = await DataStore.get(DATASTORE_SESSION_KEY);
            if (wasInVC === false) {
                DataStore.del(DATASTORE_KEY);
                return;
            }

            setTimeout(async () => {
                const saved = await DataStore.get(DATASTORE_KEY);
                if (!saved?.channelId) return;

                const preventionMode = settings.store.preventReconnectIfCallEnded;
                if (preventionMode !== "none") {
                    const channel = ChannelStore.getChannel(saved.channelId);

                    if (!channel) {
                        DataStore.set(DATASTORE_SESSION_KEY, false);
                        return;
                    }

                    const isDM = !saved.guildId;
                    const shouldPrevent =
                        preventionMode === "both" ||
                        (preventionMode === "dms" && isDM) ||
                        (preventionMode === "servers" && !isDM);

                    if (shouldPrevent) {
                        const connectedUsers = VoiceStateStore.getVoiceStatesForChannel(saved.channelId);
                        const othersInCall = Object.values(connectedUsers).filter(
                            (vs: any) => vs.userId !== UserStore.getCurrentUser().id
                        );

                        if (othersInCall.length === 0) {
                            DataStore.set(DATASTORE_SESSION_KEY, false);
                            return;
                        }
                    }
                }

                FluxDispatcher.dispatch({
                    type: "VOICE_CHANNEL_SELECT",
                    guildId: saved.guildId,
                    channelId: saved.channelId,
                });

                DataStore.set(DATASTORE_SESSION_KEY, true);
            }, settings.store.rejoinDelay * 1000);
        },
    },
});
