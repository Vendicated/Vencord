/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 OpenAsar
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

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { VoiceState } from "@vencord/discord-types";
import { ChannelStore, FluxDispatcher, GuildMemberStore, Toasts, UserStore, VoiceStateStore } from "@webpack/common";

interface ChannelState {
    userId: string;
    channelId: string;
    deaf: boolean;
    mute: boolean;
    stream: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    selfStream: boolean;
}

const settings = definePluginSettings({
    port: {
        type: OptionType.NUMBER,
        description: "Port to connect to",
        default: 6888,
        restartNeeded: true
    },
    messageAlignment: {
        type: OptionType.SELECT,
        description: "Alignment of messages in the overlay",
        options: [
            { label: "Top left", value: "topleft", default: true },
            { label: "Top right", value: "topright" },
            { label: "Bottom left", value: "bottomleft" },
            { label: "Bottom right", value: "bottomright" },
        ],
        default: "topright",
        restartNeeded: true
    },
    userAlignment: {
        type: OptionType.SELECT,
        description: "Alignment of users in the overlay",
        options: [
            { label: "Top left", value: "topleft", default: true },
            { label: "Top right", value: "topright" },
            { label: "Bottom left", value: "bottomleft" },
            { label: "Bottom right", value: "bottomright" },
        ],
        default: "topleft",
        restartNeeded: true
    },
    voiceSemitransparent: {
        type: OptionType.BOOLEAN,
        description: "Make voice channel members transparent",
        default: true,
        restartNeeded: true
    },
    messagesSemitransparent: {
        type: OptionType.BOOLEAN,
        description: "Make message notifications transparent",
        default: false,
        restartNeeded: true
    },
});

let ws: WebSocket | null = null;
let currentChannel: string | null = null;

async function waitForPopulate(fn) {
    while (true) {
        const result = await fn();
        if (result) return result;
        await new Promise(r => setTimeout(r, 500));
    }
}

function stateToPayload(guildId: string, state: VoiceState) {
    const user = UserStore.getUser(state.userId);
    const nickname = GuildMemberStore.getNick(guildId, state.userId);
    return {
        userId: state.userId,
        username: nickname || (user as any).globalName || user.username,
        avatarUrl: user.avatar,
        channelId: state.channelId,
        deaf: state.deaf || state.selfDeaf,
        mute: state.mute || state.selfMute,
        streaming: state.selfStream,
        speaking: false,
    };
}

const incoming = payload => {
    switch (payload.cmd) {
        case "TOGGLE_MUTE":
            FluxDispatcher.dispatch({
                type: "AUDIO_TOGGLE_SELF_MUTE",
                syncRemote: true,
                playSoundEffect: true,
                context: "default"
            });
            break;
        case "TOGGLE_DEAF":
            FluxDispatcher.dispatch({
                type: "AUDIO_TOGGLE_SELF_DEAF",
                syncRemote: true,
                playSoundEffect: true,
                context: "default"
            });
            break;
        case "DISCONNECT":
            FluxDispatcher.dispatch({
                type: "VOICE_CHANNEL_SELECT",
                channelId: null
            });
            break;
        case "STOP_STREAM": {
            const userId = UserStore.getCurrentUser().id;
            const voiceState = VoiceStateStore.getVoiceStateForUser(userId);
            if (!voiceState?.channelId) return;
            const channel = ChannelStore.getChannel(voiceState.channelId);
            if (!channel) return;

            FluxDispatcher.dispatch({
                type: "STREAM_STOP",
                streamKey: `guild:${channel.guild_id}:${voiceState.channelId}:${userId}`,
                appContext: "APP"
            });
        }
    }
};

const createWebsocket = () => {
    console.log("Attempting to connect to Orbolay server");

    if (ws?.close) ws.close();

    setTimeout(() => {
        if (ws?.readyState !== WebSocket.OPEN) {
            Toasts.show({
                message: "Orbolay websocket could not connect. Is it running?",
                type: Toasts.Type.FAILURE,
                id: Toasts.genId(),
            });
            ws = null;
            return;
        }
    }, 1000);

    ws = new WebSocket("ws://127.0.0.1:" + settings.store.port);
    ws.onerror = e => {
        ws?.close?.();
        ws = null;
        throw e;
    };
    ws.onmessage = e => {
        incoming(JSON.parse(e.data));
    };
    ws.onclose = () => {
        ws = null;
    };
    ws.onopen = async () => {
        Toasts.show({
            message: "Connected to Orbolay server",
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
        });

        const config = {
            ...settings.store,
            userId: null,
        };

        config.userId = await waitForPopulate(() => UserStore.getCurrentUser().id);

        ws?.send(JSON.stringify({ cmd: "REGISTER_CONFIG", ...config }));

        if (!config.userId) return;
        const userVoiceState = VoiceStateStore.getVoiceStateForUser(config.userId);
        if (!userVoiceState || !userVoiceState.channelId) return;

        const channel = ChannelStore.getChannel(userVoiceState.channelId);
        if (!channel) return;

        const guildId = channel.guild_id;
        const channelState = VoiceStateStore.getVoiceStatesForChannel(userVoiceState.channelId);

        if (!guildId || !channelState) return;

        ws?.send(
            JSON.stringify({
                cmd: "CHANNEL_JOINED",
                states: Object.values(channelState).map(s => stateToPayload(guildId, s)),
            })
        );

        currentChannel = userVoiceState.channelId;
    };
};

export default definePlugin({
    name: "OrbolayBridge",
    description: "Bridge plugin to connect Orbolay to Discord",
    authors: [EquicordDevs.SpikeHD],
    settings,
    flux: {
        SPEAKING({ userId, speakingFlags }) {
            ws?.send(
                JSON.stringify({
                    cmd: "VOICE_STATE_UPDATE",
                    state: {
                        userId: userId,
                        speaking: speakingFlags === 1,
                    },
                })
            );
        },
        async VOICE_STATE_UPDATES({ voiceStates }) {
            const { id } = UserStore.getCurrentUser();

            for (const state of voiceStates) {
                const ourState = state.userId === id;
                const { guildId } = state;

                if (ourState) {
                    if (state.channelId && state.channelId !== currentChannel) {
                        const voiceStates = await waitForPopulate(() => VoiceStateStore.getVoiceStatesForChannel(state.channelId));

                        ws?.send(
                            JSON.stringify({
                                cmd: "CHANNEL_JOINED",
                                states: Object.values(voiceStates).map(s => stateToPayload(guildId, s as VoiceState)),
                            })
                        );

                        currentChannel = state.channelId;
                        break;
                    } else if (!state.channelId) {
                        ws?.send(
                            JSON.stringify({
                                cmd: "CHANNEL_LEFT",
                            })
                        );

                        currentChannel = null;
                        break;
                    }
                }

                if (!!currentChannel && (state.channelId === currentChannel || state.oldChannelId === currentChannel)) {
                    ws?.send(
                        JSON.stringify({
                            cmd: "VOICE_STATE_UPDATE",
                            state: stateToPayload(guildId, state),
                        })
                    );
                }
            }
        },
        RPC_NOTIFICATION_CREATE({ title, body, icon, channelId }) {
            ws?.send(
                JSON.stringify({
                    cmd: "MESSAGE_NOTIFICATION",
                    message: {
                        title: title,
                        body: body,
                        icon: icon,
                        channelId: channelId,
                    }
                })
            );
        }
    },
    start() {
        createWebsocket();
    }
});
