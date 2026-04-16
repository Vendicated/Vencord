/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { VoiceState } from "@vencord/discord-types";
import { ChannelStore, FluxDispatcher, UserStore, VoiceStateStore } from "@webpack/common";

const DATASTORE_KEY = "VCLastVoiceChannel";
const DATASTORE_SESSION_KEY = "VCLastVoiceChannelSession";
const logger = new Logger("VoiceRejoin");

const settings = definePluginSettings({
    rejoinDelay: {
        type: OptionType.SLIDER,
        description: "Set Delay before rejoining voice channel.",
        markers: makeRange(1, 10, 1),
        default: 2,
        stickToMarkers: true,
    },
    rejoinTimeout: {
        type: OptionType.SLIDER,
        description: "Don't attempt to rejoin after this many seconds have passed since disconnecting.",
        markers: makeRange(5, 120, 5),
        default: 30,
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
    applyOnlyToDms: {
        type: OptionType.BOOLEAN,
        description: "Only apply to DMs.",
        default: false,
    }
});

export default definePlugin({
    name: "VoiceRejoin",
    description: "Rejoins DM/Server call automatically when restarting Discord.",
    tags: ["Servers", "Utility", "Voice"],
    authors: [EquicordDevs.omaw, EquicordDevs.keircn],
    settings,

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const currentUser = UserStore.getCurrentUser();
            if (!currentUser) return;

            const myUserId = currentUser.id;
            const myState = voiceStates.find(s => s.userId === myUserId);
            if (!myState) return;

            if (myState.channelId) {
                const saved = {
                    guildId: myState.guildId ?? null,
                    channelId: myState.channelId,
                    timestamp: Date.now(),
                };
                void Promise.all([
                    DataStore.set(DATASTORE_KEY, saved),
                    DataStore.set(DATASTORE_SESSION_KEY, true)
                ]).catch(err => logger.error("Failed to persist last voice channel", err));
            } else {
                void DataStore.set(DATASTORE_SESSION_KEY, false)
                    .catch(err => logger.error("Failed to persist voice session state", err));
            }
        },

        async CONNECTION_OPEN() {
            const wasInVC = await DataStore.get(DATASTORE_SESSION_KEY);
            if (wasInVC === false) {
                await DataStore.del(DATASTORE_KEY);
                return;
            }

            setTimeout(async () => {
                try {
                    const saved = await DataStore.get(DATASTORE_KEY);
                    if (!saved?.channelId) return;

                    let channel = ChannelStore.getChannel(saved.channelId);
                    for (let i = 0; i < 20 && !channel; i++) {
                        await new Promise(resolve => setTimeout(resolve, 250));
                        channel = ChannelStore.getChannel(saved.channelId);
                    }

                    if (!channel) {
                        await DataStore.set(DATASTORE_SESSION_KEY, false);
                        return;
                    }

                    const currentUser = UserStore.getCurrentUser();
                    if (!currentUser) return;

                    const isDM = channel.isDM() || channel.isGroupDM() || channel.isMultiUserDM();
                    const myUserId = currentUser.id;
                    const myVoiceState = VoiceStateStore.getVoiceStateForUser(myUserId);
                    const preventionMode = settings.store.preventReconnectIfCallEnded;
                    const timeoutMs = settings.store.rejoinTimeout * 1000;

                    if (saved.timestamp && Date.now() - saved.timestamp > timeoutMs) {
                        await DataStore.set(DATASTORE_SESSION_KEY, false);
                        return;
                    }

                    if (settings.store.applyOnlyToDms && !isDM) {
                        await DataStore.set(DATASTORE_SESSION_KEY, false);
                        return;
                    }

                    if (preventionMode !== "none") {
                        const shouldPrevent =
                            preventionMode === "both" ||
                            (preventionMode === "dms" && isDM) ||
                            (preventionMode === "servers" && !isDM);

                        if (shouldPrevent) {
                            const connectedUsers = VoiceStateStore.getVoiceStatesForChannel(saved.channelId) as Record<string, VoiceState>;
                            const othersInCall = Object.values(connectedUsers).filter(
                                vs => vs.userId !== myUserId
                            );

                            if (othersInCall.length === 0) {
                                await DataStore.set(DATASTORE_SESSION_KEY, false);
                                return;
                            }
                        }
                    }

                    if (myVoiceState?.channelId) {
                        await DataStore.set(DATASTORE_SESSION_KEY, false);
                        return;
                    }

                    FluxDispatcher.dispatch({
                        type: "VOICE_CHANNEL_SELECT",
                        guildId: saved.guildId,
                        channelId: saved.channelId,
                    });

                    await DataStore.set(DATASTORE_SESSION_KEY, true);
                } catch (err) {
                    logger.error("Failed to run voice rejoin", err);
                }
            }, settings.store.rejoinDelay * 1000);
        },
    },
});
