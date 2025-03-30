/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore } from "@webpack/common";
import type { Message } from "discord-types/general";

const settings = definePluginSettings({
    userList: {
        description:
            "List of users to allow or exempt pings for (separated by commas or spaces)",
        type: OptionType.STRING,
        default: "1234567890123445,1234567890123445",
    },
    shouldPingListedUsers: {
        description: "Behaviour",
        type: OptionType.SELECT,
        options: [
            {
                label: "Do not ping the listed users",
                value: false,
            },
            {
                label: "Only ping the listed users",
                value: true,
                default: true,
            },
        ],
    },
    serverList: {
        description:
            "List of servers to allow or exempt pings for (separated by commas or spaces)",
        type: OptionType.STRING,
        default: "1234567890123445,1234567890123445",
    },
    shouldPingListedServers: {
        description: "Behaviour",
        type: OptionType.SELECT,
        options: [
            {
                label: "Do not ping in the listed servers",
                value: false,
                default: true,
            },
            {
                label: "Only ping in the listed servers",
                value: true,
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
    authors: [Devs.DustyAngel47, Devs.axyie, Devs.pylix, Devs.outfoxxed, Devs.scattagain],
    settings,

    shouldMention(message: Message, isHoldingShift: boolean) {
        const isUserListed = settings.store.userList.includes(message.author.id);
        const isUserExempt = settings.store.shouldPingListedUsers ? isUserListed : !isUserListed;

        const isServerListed = settings.store.serverList.includes(ChannelStore.getChannel(message.channel_id)?.guild_id);
        const isServerExempt = settings.store.shouldPingListedServers ? isServerListed : !isServerListed;

        const isExpemt = isUserExempt || isServerExempt;
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
