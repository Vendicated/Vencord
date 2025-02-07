/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelRouter, ChannelStore, SelectedChannelStore } from "@webpack/common";
import { Message } from "discord-types/general";

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}


const settings = definePluginSettings({
    whitelistedServers: {
        type: OptionType.SELECT,
        description: "Whether to use ID list as blacklist or whitelist",
        options: [
            {
                label: "Blacklist",
                value: "blacklist",
                default: true
            },
            {
                label: "Whitelist",
                value: "whitelist"
            }
        ],
        default: "Blacklist"
    },
    servers: {
        type: OptionType.STRING,
        description: "Blacklisted/Whitelisted server ids, separated by commas",
        default: "",
    },
    whitelistedChannels: {
        type: OptionType.SELECT,
        description: "Whether to use ID list as blacklist or whitelist",
        options: [
            {
                label: "Blacklist",
                value: "blacklist",
                default: true
            },
            {
                label: "Whitelist",
                value: "whitelist"
            }
        ],
        default: "Blacklist"
    },
    channels: {
        type: OptionType.STRING,
        description: "Blacklisted/Whitelisted channel ids, separated by commas",
        default: "",
    },
});

export default definePlugin({
    name: "MessageJumper",
    description: "Auto jumps to channels with new messages",
    authors: [Devs.may2bee],
    settings,

    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (SelectedChannelStore.getChannelId() === channelId) return;
            const channel = ChannelStore.getChannel(channelId);
            if (document.hasFocus()) return;

            const { whitelistedServers, servers, whitelistedChannels, channels } = settings.store;

            const serverIds = servers.split(",").map(id => id.trim());
            if (whitelistedServers === "whitelist") {
                if (!serverIds.includes(channel.guild_id)) {
                    return;
                }
            } else {
                if (serverIds.includes(channel.guild_id)) {
                    return;
                }
            }

            const channelIds = channels!!.split(",").map(id => id.trim());
            if (whitelistedChannels === "whitelist") {
                if (!channelIds.includes(channelId)) {
                    return;
                }
            } else {
                if (channelIds.includes(channelId)) {
                    return;
                }
            }

            ChannelRouter.transitionToChannel(channelId);
        },
    }
});
