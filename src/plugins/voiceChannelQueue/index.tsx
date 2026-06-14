/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, ConfirmModal, Menu, openModal, PermissionsBits, PermissionStore, showToast, Toasts, UserStore, VoiceStateStore } from "@webpack/common";

const { selectVoiceChannel } = findByPropsLazy("selectVoiceChannel", "selectChannel");

const settings = definePluginSettings({
    notifyOnQueue: {
        type: OptionType.BOOLEAN,
        description: "Show a toast when you are queued for a voice channel",
        default: true
    }
});

let queuedChannelId: string | null = null;

function getVoiceChannelMemberCount(channelId: string) {
    const states = VoiceStateStore.getVoiceStatesForChannel(channelId);
    return states ? Object.keys(states).length : 0;
}

function isVoiceChannelFull(channel: Channel) {
    if (!channel.isGuildVocal()) return false;

    const limit = channel.userLimit;
    if (!limit) return false;

    return getVoiceChannelMemberCount(channel.id) >= limit;
}

function canQueueChannel(channel: Channel) {
    if (!channel.isGuildVocal()) return false;
    if (!PermissionStore.can(PermissionsBits.CONNECT, channel)) return false;
    if (VoiceStateStore.isInChannel(channel.id)) return false;
    return isVoiceChannelFull(channel);
}

function clearQueue() {
    queuedChannelId = null;
}

function setQueue(channelId: string) {
    queuedChannelId = channelId;

    if (settings.store.notifyOnQueue) {
        const channel = ChannelStore.getChannel(channelId);
        showToast(`Queued for ${channel?.name ?? "voice channel"}`, Toasts.Type.MESSAGE);
    }
}

function tryJoinQueuedChannel() {
    if (!queuedChannelId) return;

    const channel = ChannelStore.getChannel(queuedChannelId);
    if (!channel || isVoiceChannelFull(channel)) return;

    const channelId = queuedChannelId;
    clearQueue();
    selectVoiceChannel(channelId);
    showToast(`Joining ${channel.name}`, Toasts.Type.SUCCESS);
}

function openQueueModal(channel: Channel) {
    const count = getVoiceChannelMemberCount(channel.id);
    const limit = channel.userLimit;

    openModal(props => (
        <ConfirmModal
            {...props}
            title="Voice Channel Full"
            subtitle={`${channel.name} is full (${count}/${limit}). Would you like to queue and join when a spot opens up?`}
            confirmText="Queue"
            cancelText="Cancel"
            onConfirm={() => setQueue(channel.id)}
        />
    ));
}

function handleVoiceChannelClick(channel: Channel | null | undefined) {
    if (!channel || !canQueueChannel(channel)) return false;

    openQueueModal(channel);
    return true;
}

const channelContextPatch: NavContextMenuPatchCallback = (children, { channel }) => {
    if (!channel || !canQueueChannel(channel)) return;

    const group = findGroupChildrenByChildId(["mute-channel", "unmute-channel"], children) ?? children;

    group.push(
        <Menu.MenuItem
            id="vc-voice-channel-queue"
            label={queuedChannelId === channel.id ? "Cancel Voice Queue" : "Queue Voice Channel"}
            action={() => {
                if (queuedChannelId === channel.id) {
                    clearQueue();
                    showToast("Voice queue cancelled", Toasts.Type.MESSAGE);
                    return;
                }

                openQueueModal(channel);
            }}
        />
    );
};

export default definePlugin({
    name: "VoiceChannelQueue",
    description: "Queue for full voice channels and automatically join when a spot opens up",
    tags: ["Voice", "Utility"],
    authors: [Devs.Noah],
    settings,

    // i tihnk i got all of the ways that u can route to a voice chat. at least these are all the ones i could find!
    patches: [
        {
            find: ".handleClickChat",
            replacement: {
                match: /handleClick\(\)\{/,
                replace: "handleClick(){if($self.handleVoiceChannelClick(this.props?.channel))return;"
            }
        },
        {
            find: "VoiceChannel, transitionTo: Channel does not have a guildId",
            replacement: {
                match: /(?=\|\|\i\.\i\.selectVoiceChannel\((\i)\.id\))/,
                replace: (_, channel) => `||$self.handleVoiceChannelClick(${channel})`
            }
        },
        {
            find: 'getConfig({location:"channel_mention"})',
            replacement: {
                match: /(?<=getChannel\(\i\);if\(null!=(\i)).{0,200}?return void (?=\i\.default\.selectVoiceChannel)/,
                replace: (m, channel) => `${m}$self.handleVoiceChannelClick(${channel})||`
            }
        }
    ],

    handleVoiceChannelClick,

    contextMenus: {
        "channel-context": channelContextPatch
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: { userId: string; channelId?: string; oldChannelId?: string; }[]; }) {
            if (!queuedChannelId) return;

            const myId = UserStore.getCurrentUser().id;
            let shouldCheck = false;

            for (const state of voiceStates) {
                if (state.channelId === queuedChannelId || state.oldChannelId === queuedChannelId) {
                    shouldCheck = true;
                }

                if (state.userId === myId && state.channelId && state.channelId !== queuedChannelId) {
                    clearQueue();
                    return;
                }
            }

            if (shouldCheck) tryJoinQueuedChannel();
        }
    },

    stop() {
        clearQueue();
    }
});
