/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, SelectedChannelStore } from "@webpack/common";

const timers = {} as Record<string, {
    timeout?: NodeJS.Timeout;
    i: number;
}>;

function switchToVoiceChannel(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel || ![2, 13].includes(channel.type)) return;

    const data = (timers[channelId] ??= { timeout: void 0, i: 0 });
    clearTimeout(data.timeout);

    if (++data.i >= 2) {
        // Implement your logic to switch the current channel to the specified voice channel
        console.log(`Switching to voice channel: ${channelId}`);
        // You may use Discord API or other methods to switch the channel here
        // Example: DiscordAPI.switchChannel(channelId);
        delete timers[channelId];
    } else {
        data.timeout = setTimeout(() => {
            delete timers[channelId];
        }, 500);
    }
}

function handler(event: KeyboardEvent) {
    const hotkey = settings.store.FindVCKey.toLowerCase();

    if (hotkey && event.key.toLowerCase() === hotkey) {
        const currentVoiceChannelId = SelectedChannelStore.getVoiceChannelId();
        if (currentVoiceChannelId) {
            switchToVoiceChannel(currentVoiceChannelId);
        }
    }
}

const settings = definePluginSettings({
    FindVCKey: {
        type: OptionType.STRING,
        description: "Finds the current VC Chat you are in by executing the shortcut Home",
        default: "Home",
    },
});

export default definePlugin({
    name: "FindVC",
    description: "Finds the current VC Chat you are in by executing the shortcut Home",
    authors: [
        {
            id: 995923917594173440n,
            name: "LuckyCanucky",
        },
    ],
    settings,

    start() {
        window.addEventListener("keydown", handler);
    },

    stop() {
        window.removeEventListener("keydown", handler);
    },
});
