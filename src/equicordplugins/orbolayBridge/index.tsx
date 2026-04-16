/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, FluxDispatcher, GuildMemberStore, StreamerModeStore, Toasts, UserStore, VoiceStateStore } from "@webpack/common";

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
    isKeybindEnabled: {
        type: OptionType.BOOLEAN,
        description: "Enable/disable the global keybind (Ctrl + `)",
        default: true,
        restartNeeded: true,
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

const waitForPopulate = async fn => {
    while (true) {
        const result = await fn();
        if (result) return result;
        await new Promise(r => setTimeout(r, 500));
    }
};

const stateToPayload = (guildId: string, state: ChannelState) => ({
    userId: state.userId,
    username:
        GuildMemberStore.getNick(guildId, state.userId) ||
        UserStore.getUser(state.userId)?.globalName,
    avatarUrl: UserStore.getUser(state.userId)?.avatar,
    channelId: state.channelId,
    deaf: state.deaf || state.selfDeaf,
    mute: state.mute || state.selfMute,
    streaming: state.selfStream,
    speaking: false,
});

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

            break;
        }
        case "NAVIGATE": {
            if (!payload.guild_id || !payload.channel_id || !payload.message_id) break;

            const { guild_id, channel_id, message_id } = payload;
            FluxDispatcher.dispatch({
                type: "CHANNEL_SELECT",
                guildId: String(guild_id),
                channelId: String(channel_id),
                messageId: String(message_id),
            });

            break;
        }
    }
};

const handleSpeaking = dispatch => {
    ws?.send(
        JSON.stringify({
            cmd: "VOICE_STATE_UPDATE",
            state: {
                userId: dispatch.userId,
                speaking: dispatch.speakingFlags === 1,
            },
        })
    );
};

const handleMessageNotification = dispatch => {
    ws?.send(
        JSON.stringify({
            cmd: "MESSAGE_NOTIFICATION",
            message: {
                title: dispatch.title,
                body: dispatch.body,
                icon: dispatch.icon,
                guildId: dispatch.message.guild_id,
                channelId: dispatch.message.channel_id,
                messageId: dispatch.message.id,
            }
        })
    );
};

const handleVoiceStateUpdates = async dispatch => {
    const { id } = UserStore.getCurrentUser();

    for (const state of dispatch.voiceStates) {
        const ourState = state.userId === id;
        const { guildId } = state;

        if (ourState) {
            if (state.channelId && state.channelId !== currentChannel) {
                const voiceStates = await waitForPopulate(() =>
                    VoiceStateStore?.getVoiceStatesForChannel(state.channelId)
                );

                ws?.send(
                    JSON.stringify({
                        cmd: "CHANNEL_JOINED",
                        states: Object.values(voiceStates).map(s => stateToPayload(guildId, s as ChannelState)),
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

        if (
            !!currentChannel &&
            (state.channelId === currentChannel ||
                state.oldChannelId === currentChannel)
        ) {
            ws?.send(
                JSON.stringify({
                    cmd: "VOICE_STATE_UPDATE",
                    state: stateToPayload(guildId, state as ChannelState),
                })
            );
        }
    }
};

const handleStreamerMode = dispatch => {
    ws?.send(
        JSON.stringify({
            cmd: "STREAMER_MODE",
            enabled: dispatch.value,
        })
    );
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
        if (!config.userId) return;

        ws?.send(JSON.stringify({ cmd: "REGISTER_CONFIG", ...config }));

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
                states: Object.values(channelState).map(s => stateToPayload(guildId, s as ChannelState)),
            })
        );

        ws?.send(
            JSON.stringify({
                cmd: "STREAMER_MODE",
                enabled: StreamerModeStore.enabled,
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
        SPEAKING: handleSpeaking,
        VOICE_STATE_UPDATES: handleVoiceStateUpdates,
        RPC_NOTIFICATION_CREATE: handleMessageNotification,
        STREAMER_MODE: handleStreamerMode,
    },

    start() {
        createWebsocket();
    },

    stop() {
        ws?.close?.();
        ws = null;
    }
});
