/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, GuildMemberStore } from "@webpack/common";
import type { Message } from "discord-types/general";

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
                label: "Do not ping the listed users/roles",
                value: false,
            },
            {
                label: "Only ping the listed users/roles",
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
    authors: [Devs.DustyAngel47, Devs.axyie, Devs.pylix, Devs.outfoxxed, Devs.unionizing],
    settings,

    shouldMention(message: Message, isHoldingShift: boolean) {
        const channel = ChannelStore.getChannel(message.channel_id);
        let isListed = settings.store.userList.includes(message.author.id);

        if (channel) {
            const roles = GuildMemberStore.getMember(channel.guild_id, message.author.id)?.roles;

            roles.forEach(role => {
                if (settings.store.roleList.includes(role)) {
                    isListed = true;
                }
            });
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
