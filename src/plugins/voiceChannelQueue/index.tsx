/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
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

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, ConfirmModal, Menu, openModal, PermissionsBits, PermissionStore, showToast, Toasts, UserStore, VoiceStateStore } from "@webpack/common";

interface VoiceStateChangeEvent {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
}

const { selectVoiceChannel } = findByPropsLazy("selectVoiceChannel", "selectChannel");

let queuedChannelId: string | null = null;

function openQueueModal(channel: Channel) {
    const states = VoiceStateStore.getVoiceStatesForChannel(channel.id);
    const count = states ? Object.keys(states).length : 0;

    openModal(props => (
        <ConfirmModal
            {...props}
            title="Voice Channel Full"
            subtitle={`${channel.name} is full (${count}/${channel.userLimit}). Queue and join when someone leaves?`}
            confirmText="Queue"
            cancelText="Cancel"
            onConfirm={() => {
                queuedChannelId = channel.id;
                showToast(`Queued for ${channel.name}`, Toasts.Type.MESSAGE);
            }}
        />
    ));
}

const patchChannelContextMenu: NavContextMenuPatchCallback = (children, { channel }) => {
    if (!channel?.isGuildVocal() || !channel.userLimit) return;
    if (!PermissionStore.can(PermissionsBits.CONNECT, channel)) return;
    if (VoiceStateStore.isInChannel(channel.id)) return;

    const states = VoiceStateStore.getVoiceStatesForChannel(channel.id);
    const count = states ? Object.keys(states).length : 0;
    if (count < channel.userLimit) return;

    const group = findGroupChildrenByChildId(["mute-channel", "unmute-channel"], children) ?? children;
    group.push(
        <Menu.MenuItem
            id="vc-voice-channel-queue"
            label={queuedChannelId === channel.id ? "Cancel Voice Queue" : "Queue Voice Channel"}
            action={() => {
                if (queuedChannelId === channel.id) {
                    queuedChannelId = null;
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
    searchTerms: ["VoiceQueue", "FullVC", "voice queue", "vc queue"],

    patches: [
        {
            find: ".handleClickChat",
            replacement: {
                match: /handleClick\(\)\{/,
                replace: "handleClick(){if($self.handleVoiceChannelClick(this.props?.channel))return;"
            }
        },
        {
            // i just took this from show hidden channels
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

    handleVoiceChannelClick(channel: Channel | null | undefined) {
        if (!channel?.isGuildVocal() || !channel.userLimit) return false;
        if (!PermissionStore.can(PermissionsBits.CONNECT, channel)) return false;
        if (VoiceStateStore.isInChannel(channel.id)) return false;

        const states = VoiceStateStore.getVoiceStatesForChannel(channel.id);
        const count = states ? Object.keys(states).length : 0;
        if (count < channel.userLimit) return false;

        openQueueModal(channel);
        return true;
    },

    contextMenus: {
        "channel-context": patchChannelContextMenu
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceStateChangeEvent[]; }) {
            if (!queuedChannelId) return;

            const myId = UserStore.getCurrentUser().id;

            for (const state of voiceStates) {
                if (state.userId === myId && state.channelId && state.channelId !== queuedChannelId) {
                    queuedChannelId = null;
                    return;
                }
            }

            if (!voiceStates.some(s => s.channelId === queuedChannelId || s.oldChannelId === queuedChannelId))
                return;

            const channel = ChannelStore.getChannel(queuedChannelId);
            if (!channel?.userLimit) return;

            const states = VoiceStateStore.getVoiceStatesForChannel(queuedChannelId);
            const count = states ? Object.keys(states).length : 0;
            if (count >= channel.userLimit) return;

            const id = queuedChannelId;
            queuedChannelId = null;
            selectVoiceChannel(id);
            showToast(`Joining ${channel.name}`, Toasts.Type.SUCCESS);
        }
    },

    stop() {
        queuedChannelId = null;
    }
});
