/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { ChannelStore, GuildMemberStore } from "@webpack/common";

const settings = definePluginSettings({
    userList: {
        description:
            "List of users to allow or exempt pings for (separated by commas or spaces)",
        type: OptionType.STRING,
        default: "1234567890123445,1234567890123445",
    },
    roleList: {
        description:
            "List of roles to allow or exempt pings for (separated by commas or spaces)",
        type: OptionType.STRING,
        default: "1234567890123445,1234567890123445",
    },
    shouldPingListed: {
        description: "Behaviour",
        type: OptionType.SELECT,
        options: [
            {
                label: "Do not ping the listed users / roles",
                value: false,
            },
            {
                label: "Only ping the listed users / roles",
                value: true,
                default: true,
            },
        ],
    },
    inverseShiftReply: {
        description: "Invert Discord's shift replying behaviour (enable to make shift reply mention user)",
        type: OptionType.BOOLEAN,
        default: false,
    }
});

export default definePlugin({
    name: "NoReplyMention",
    description: "Disables reply pings by default",
    authors: [Devs.DustyAngel47, Devs.rae, Devs.pylix, Devs.outfoxxed],
    settings,

    shouldMention(message: Message, isHoldingShift: boolean) {
        let isListed = settings.store.userList.includes(message.author.id);

        const channel = ChannelStore.getChannel(message.channel_id);
        if (channel?.guild_id && !isListed) {
            const roles = GuildMemberStore.getMember(channel.guild_id, message.author.id)?.roles;
            isListed = !!roles && roles.some(role => settings.store.roleList.includes(role));
        }

        const isExempt = settings.store.shouldPingListed ? isListed : !isListed;
        return settings.store.inverseShiftReply ? isHoldingShift !== isExempt : !isHoldingShift && isExempt;
    },

    patches: [
        {
            find: ",\"Message\")}function",
            replacement: {
                match: /:(\i),shouldMention:!(\i)\.shiftKey/,
                replace: ":$1,shouldMention:$self.shouldMention($1,$2.shiftKey)"
            }
        }
    ],
});
