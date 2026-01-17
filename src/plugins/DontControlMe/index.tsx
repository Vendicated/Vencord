/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Menu, RestAPI, SelectedChannelStore, Toasts, UserStore } from "@webpack/common";

const VoiceStateStore: VoiceStateStore = findStoreLazy("VoiceStateStore");
const ChannelActions: {
    disconnect: () => void;
    selectVoiceChannel: (channelId: string) => void;
} = findByPropsLazy("disconnect", "selectVoiceChannel");

interface VoiceStateStore {
    getAllVoiceStates(): VoiceStateEntry;
    getVoiceStatesForChannel(channelId: string): VoiceStateMember;
}

interface VoiceStateEntry {
    [guildIdOrMe: string]: VoiceStateMember;
}

interface VoiceStateMember {
    [userId: string]: VoiceState;
}

interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    guildId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    selfStream: boolean;
    selfVideo: boolean;
    sessionId: string;
    suppress: boolean;
    requestToSpeakTimestamp: string | null;
    communicationDisabledUntil?: string | null;
}

let lastChannelId: string | null = null;
let isHandlingAction = false;
let lastMoveTimestamp = 0;
let pinnedChannelId: string | null = null;
const debounceTime = 1500; // Reduced from 3000ms to 1500ms for faster response

const settings = definePluginSettings({
    reconnect: {
        type: OptionType.BOOLEAN,
        description: "Automatically reconnect if disconnected",
        default: true,
    },
    autoUndeafen: {
        type: OptionType.BOOLEAN,
        description: "Automatically undeafen if server-deafened",
        default: true,
    },
    autoUnmute: {
        type: OptionType.BOOLEAN,
        description: "Automatically unmute if server-muted",
        default: true,
    },
    moveToPinned: {
        type: OptionType.BOOLEAN,
        description: "Return to pinned channel if moved",
        default: true,
    },
    cooldown: {
        type: OptionType.SLIDER,
        description: "Cooldown between actions (in seconds)",
        default: 1, // Reduced from 2 to 1 second
        markers: [0.5, 1, 1.5, 2, 3],
    },
});

async function addCooldown() {
    isHandlingAction = true;
    await new Promise(resolve => setTimeout(resolve, settings.store.cooldown * 1000));
    isHandlingAction = false;
}

function handleVoiceStateUpdate(voiceStates: VoiceState[]) {
    if (isHandlingAction) return;

    const myId = UserStore.getCurrentUser().id;
    const myVoiceState = voiceStates.find(state => state.userId === myId);

    // Handle disconnection and reconnection
    if (!myVoiceState && lastChannelId && pinnedChannelId) {
        const now = Date.now();
        
        if (settings.store.reconnect && now - lastMoveTimestamp > debounceTime) {
            const voiceStates = VoiceStateStore.getVoiceStatesForChannel(lastChannelId);
            const isAlreadyInChannel = voiceStates && Object.keys(voiceStates).includes(myId);

            if (!isAlreadyInChannel && pinnedChannelId === lastChannelId) {
                lastMoveTimestamp = now;
                ChannelActions.selectVoiceChannel(lastChannelId);
                Toasts.show({
                    message: "Reconnected to pinned voice channel!",
                    id: Toasts.genId(),
                    type: Toasts.Type.SUCCESS,
                });
                addCooldown();
            }
        }
        return;
    }

    if (!myVoiceState) return;

    // Prevent moving from pinned channel
    if (settings.store.moveToPinned && pinnedChannelId && myVoiceState.channelId !== pinnedChannelId) {
        ChannelActions.selectVoiceChannel(pinnedChannelId);
        Toasts.show({
            message: "You are pinned to this channel!",
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE,
        });
        addCooldown();
        return;
    }

    // Auto undeafen
    if (settings.store.autoUndeafen && myVoiceState.deaf && myVoiceState.guildId) {
        RestAPI.patch({
            url: `/guilds/${myVoiceState.guildId}/members/${myId}`,
            body: { deaf: false },
        });
        Toasts.show({
            message: "Automatically undeafened!",
            id: Toasts.genId(),
            type: Toasts.Type.SUCCESS,
        });
        addCooldown();
    }

    // Auto unmute
    if (settings.store.autoUnmute && myVoiceState.mute && myVoiceState.guildId) {
        RestAPI.patch({
            url: `/guilds/${myVoiceState.guildId}/members/${myId}`,
            body: { mute: false },
        });
        Toasts.show({
            message: "Automatically unmuted!",
            id: Toasts.genId(),
            type: Toasts.Type.SUCCESS,
        });
        addCooldown();
    }

    lastChannelId = myVoiceState.channelId ?? null;
    lastMoveTimestamp = Date.now();
}

const fluxListener = {
    VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
        handleVoiceStateUpdate(voiceStates);
    },
};

function addPinChannelContextMenu(children: any, { channel }: { channel: any; }) {
    if (!channel || channel.type !== 2) return;

    children.push(
        <Menu.MenuItem
            id="pin-channel"
            label={pinnedChannelId === channel.id ? "Unpin Channel" : "Pin Channel"}
            action={() => {
                pinnedChannelId = pinnedChannelId === channel.id ? null : channel.id;
                Toasts.show({
                    message: pinnedChannelId ? `Pinned channel: ${channel.name}` : "Channel unpinned",
                    id: Toasts.genId(),
                    type: Toasts.Type.SUCCESS,
                });
            }}
        />
    );
}

export default definePlugin({
    name: "DontControlMe",
    description: "Automatically reconnects, unmutes, undeafens, and prevents movement or disconnection from a pinned channel.",
    authors: [Devs["pluckerpilple"]],

    settings,

    flux: fluxListener,

    contextMenus: {
        "channel-context": addPinChannelContextMenu,
    },

    start() {
        const channelID = SelectedChannelStore.getVoiceChannelId();
        if (channelID) {
            const voiceStates = VoiceStateStore.getVoiceStatesForChannel(channelID);
            lastChannelId = voiceStates ? Object.values(voiceStates)[0]?.channelId ?? null : null;
        }
    },

    stop() {
        lastChannelId = null;
        pinnedChannelId = null;
        isHandlingAction = false;
    },
});