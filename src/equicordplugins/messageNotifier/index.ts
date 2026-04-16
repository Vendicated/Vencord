/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Notifications } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { MessageJSON } from "@vencord/discord-types";
import { MessageType } from "@vencord/discord-types/enums";
import { ChannelStore, GuildStore, NavigationRouter, RelationshipStore } from "@webpack/common";

interface MessageCreatePayload {
    guildId: string;
    channelId: string;
    message: MessageJSON;
}

const settings = definePluginSettings({
    users: {
        type: OptionType.STRING,
        description: "Comma separated list of user ids to get message toasts for",
        default: "",
        isValid(value: string) {
            if (value === "") return true;
            const userIds = value.split(",").map(id => id.trim());
            for (const id of userIds)
                if (!/\d+/.test(id)) return `${id} isn't a valid user id`;
            return true;
        },
    },
});

export default definePlugin({
    authors: [EquicordDevs.cassie, EquicordDevs.mochienya],
    name: "MessageNotifier",
    description: "Get toasts for when chosen users send a message",
    settings,
    flux: {
        MESSAGE_CREATE({ message, channelId, guildId }: MessageCreatePayload) {
            if (message.type !== MessageType.DEFAULT || getCurrentChannel()?.id === channelId) return;

            const userIds = settings.store.users.split(",").map(id => id.trim());
            if (!userIds.includes(message.author.id)) return;

            const username = RelationshipStore.getNickname(message.author.id) ?? message.author.globalName ?? message.author.username;
            const guild = GuildStore.getGuild(guildId);
            const channel = ChannelStore.getChannel(channelId);
            const locationName = guild ? `${guild.name}#${channel.name}` : channel?.name ?? "their dms";

            Notifications.showNotification({
                title: `${username} sent a message`,
                body: `Click to jump to ${locationName}`,
                onClick() {
                    NavigationRouter.transitionTo(`/channels/${guild?.id ?? "@me"}/${channel.id}/${message.id}`);
                },
            });
        },
    },
});
