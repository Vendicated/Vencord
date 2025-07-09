/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, FluxDispatcher, GuildMemberStore, StreamerModeStore, Toasts, UserStore, VoiceStateStore } from "@webpack/common";

type Alignment = "topleft" | "topright" | "bottomleft" | "bottomright";

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

interface CornerAlignment {
    top: boolean;
    left: boolean;
}

interface Config {
    port: number;
    userId: string;
    messageAlignment: CornerAlignment;
    userAlignment: CornerAlignment;
    voiceSemitransparent: boolean;
    messagesSemitransparent: boolean;
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
let currentChannel = null;

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
        // @ts-expect-error this exists
        UserStore?.getUser(state.userId)?.globalName,
    avatarUrl: UserStore?.getUser(state.userId)?.avatar,
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
            const userId = UserStore?.getCurrentUser()?.id;
            const voiceState = VoiceStateStore?.getVoiceStateForUser(userId);
            const channel = ChannelStore?.getChannel?.(voiceState?.channelId);

            // If any of these are null, we can't do anything
            if (!userId || !voiceState || !channel) return;

            FluxDispatcher.dispatch({
                type: "STREAM_STOP",
                streamKey: `guild:${channel.guild_id}:${voiceState.channelId}:${userId}`,
                appContext: "APP"
            });
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
                channelId: dispatch.channelId,
            }
        })
    );
};

const handleVoiceStateUpdates = async dispatch => {
    // Ensure we are in the channel that the update is for
    const id = UserStore?.getCurrentUser()?.id;

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

        // If this is for the channel we are in, send a VOICE_STATE_UPDATE
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

    // First ensure old connection is closed
    if (ws?.close) ws.close();

    setTimeout(() => {
        // If the ws is not ready, kill it and log
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

        // Send over the config
        const config = {
            ...settings.store,
            userId: null,
        };

        // Ensure we track the current user id
        config.userId = await waitForPopulate(() => UserStore?.getCurrentUser()?.id);

        ws?.send(JSON.stringify({ cmd: "REGISTER_CONFIG", ...config }));

        // Send initial channel joined (if the user is in a channel)
        const userVoiceState = VoiceStateStore.getVoiceStateForUser(
            config.userId,
        );

        if (!userVoiceState) {
            return;
        }

        const channelState = VoiceStateStore.getVoiceStatesForChannel(
            userVoiceState.channelId
        );
        const { guildId } = userVoiceState;

        ws?.send(
            JSON.stringify({
                cmd: "CHANNEL_JOINED",
                states: Object.values(channelState).map(s => stateToPayload(guildId, s as ChannelState)),
            })
        );

        // Also let the client know whether we are in streamer mode
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
    authors: [Devs.SpikeHD],
    hidden: false,

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
