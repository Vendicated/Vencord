/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
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
let pinnedChannelId: string | null = null; // Store pinned channel ID
const debounceTime = 3000;

const settings = definePluginSettings({
    reconnect: {
        type: OptionType.BOOLEAN,
        description: "Reconnect if disconnected",
        default: true,
    },
    autoUndeafen: {
        type: OptionType.BOOLEAN,
        description: "Auto-undeafen if server-deafened",
        default: true,
    },
    autoUnmute: {
        type: OptionType.BOOLEAN,
        description: "Auto-unmute if server-muted",
        default: true,
    },
    moveToPinned: {
        type: OptionType.BOOLEAN,
        description: "Return to the previous channel if pinned",
        default: true,
    },
    cooldown: {
        type: OptionType.SLIDER,
        description: "Cooldown between actions (in seconds)",
        default: 2,
        markers: [1, 2, 3, 4, 5],
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

    if (!myVoiceState && lastChannelId) {
        const now = Date.now();
        const voiceStates = VoiceStateStore.getVoiceStatesForChannel(lastChannelId);

        // Only proceed if a channel is pinned
        if (pinnedChannelId && settings.store.reconnect && now - lastMoveTimestamp > debounceTime) {
            const isAlreadyInChannel = voiceStates && Object.keys(voiceStates).includes(myId);

            if (!isAlreadyInChannel && pinnedChannelId === lastChannelId) {
                lastMoveTimestamp = now;
                ChannelActions.selectVoiceChannel(lastChannelId);
                Toasts.show({
                    message: "تراك رجعت",
                    id: Toasts.genId(),
                    type: Toasts.Type.SUCCESS,
                });
                addCooldown();
            }
        }
        return;
    }

    if (!myVoiceState) return;

    // Ensure you stay in the pinned channel
    if (settings.store.moveToPinned && pinnedChannelId && myVoiceState.channelId !== pinnedChannelId) {
        ChannelActions.selectVoiceChannel(pinnedChannelId);
        Toasts.show({
            message: "اتوقع انك ان سحبت",
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE,
        });
        return;
    }

    if (settings.store.autoUndeafen && myVoiceState.deaf && myVoiceState.guildId) {
        RestAPI.patch({
            url: `/guilds/${myVoiceState.guildId}/members/${myId}`,
            body: { deaf: false },
        });
        Toasts.show({
            message: "انفك الدفن",
            id: Toasts.genId(),
            type: Toasts.Type.SUCCESS,
        });
        addCooldown();
    }

    if (settings.store.autoUnmute && myVoiceState.mute && myVoiceState.guildId) {
        RestAPI.patch({
            url: `/guilds/${myVoiceState.guildId}/members/${myId}`,
            body: { mute: false },
        });
        Toasts.show({
            message: "انفك الميوت",
            id: Toasts.genId(),
            type: Toasts.Type.SUCCESS,
        });
        addCooldown();
    }

    // if (
    //     settings.store.autoMoveBack &&
    //     myVoiceState.channelId &&
    //     lastChannelId &&
    //     myVoiceState.channelId !== lastChannelId &&
    //     Date.now() - lastMoveTimestamp > debounceTime
    // ) {
    //     lastMoveTimestamp = Date.now();
    //     ChannelActions.selectVoiceChannel(lastChannelId);
    //     Toasts.show({
    //         message: "Moved back to the original voice channel!",
    //         id: Toasts.genId(),
    //         type: Toasts.Type.SUCCESS,
    //     });
    //     addCooldown();
    // }

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
            label={pinnedChannelId === channel.id ? "وخر التثبيت" : "تثبيت ف الروم"}
            action={() => {
                pinnedChannelId = pinnedChannelId === channel.id ? null : channel.id;
                Toasts.show({
                    message: pinnedChannelId ? `حطيت التثبيت ف: ${channel.name}` : "وخرت التثبيت",
                    id: Toasts.genId(),
                    type: Toasts.Type.SUCCESS,
                });
            }}
        />
    );
}

export default definePlugin({
    name: "تثبيت ف الروم",
    description: "تضغط كلك يمين على الروم",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }],
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
    },
});
