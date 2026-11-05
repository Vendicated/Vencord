/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, PermissionsBits, PermissionStore, SelectedChannelStore } from "@webpack/common";

const ChannelActions = findByPropsLazy("selectVoiceChannel", "selectChannel");

const STORE_KEY = "VoiceRejoin_lastVoiceChannel";

interface LastVoiceChannel {
    channelId: string;
    lastSeen: number;
}

const settings = definePluginSettings({
    maxMinutes: {
        type: OptionType.NUMBER,
        description: "Only rejoin if Discord was closed less than this many minutes ago",
        default: 5
    }
});

let pending: LastVoiceChannel | undefined;
let interval: ReturnType<typeof setInterval> | undefined;

function saveCurrentVoiceChannel() {
    const channelId = SelectedChannelStore.getVoiceChannelId();
    if (channelId) DataStore.set(STORE_KEY, { channelId, lastSeen: Date.now() });
}

export default definePlugin({
    name: "VoiceRejoin",
    description: "Rejoins the voice channel you were in after Discord crashes or restarts",
    tags: ["Voice", "Utility"],
    authors: [Devs.Osheun],
    settings,

    flux: {
        VOICE_CHANNEL_SELECT({ channelId }: { channelId: string | null; }) {
            if (channelId) saveCurrentVoiceChannel();
            else DataStore.del(STORE_KEY);
        },

        CONNECTION_OPEN() {
            const last = pending;
            pending = undefined;

            if (!last || SelectedChannelStore.getVoiceChannelId()) return;
            if (Date.now() - last.lastSeen > settings.store.maxMinutes * 60_000) return;

            const channel = ChannelStore.getChannel(last.channelId);
            if (!channel || !PermissionStore.can(PermissionsBits.CONNECT, channel)) return;

            ChannelActions.selectVoiceChannel(channel.id);
        }
    },

    async start() {
        pending = await DataStore.get<LastVoiceChannel>(STORE_KEY);
        interval = setInterval(saveCurrentVoiceChannel, 30_000);
    },

    stop() {
        clearInterval(interval);
    }
});
