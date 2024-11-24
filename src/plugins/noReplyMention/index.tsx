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
import type { Message } from "discord-types/general";

const settings = definePluginSettings({
    userList: {
        description:
            "List of users to allow or exempt pings for (separated by commas or spaces)",
        type: OptionType.STRING,
        default: "1234567890123445,1234567890123445",
    },
    shouldPingListed: {
        description: "Behaviour",
        type: OptionType.SELECT,
        options: [
            {
                label: "Do not ping the listed users",
                value: 0,
            },
            {
                label: "Only ping the listed users",
                value: 1,
                default: true,
            },
            {
                label: "Remember choice for each user",
                value: 2,
            },
        ],
    },
    inverseShiftReply: {
        description: "Invert Discord's shift replying behaviour (enable to make shift reply mention user)",
        type: OptionType.BOOLEAN,
        default: false,
    }
}).withPrivateSettings<{
    users?: Record<string, boolean>;
}>();

export default definePlugin({
    name: "NoReplyMention",
    description: "Disables reply pings by default",
    authors: [Devs.DustyAngel47, Devs.axyie, Devs.pylix, Devs.outfoxxed, Devs.slonkazoid],
    settings,

    shouldMention(message: Message, isHoldingShift: boolean) {
        if (settings.store.shouldPingListed === 2) {
            if (settings.store.users === undefined) settings.store.users = {};
            let preference = settings.store.users[message.author.id];
            if (typeof preference !== "boolean") {
                preference = !isHoldingShift;
                settings.store.users[message.author.id] = preference;
            }
            return preference;
        }
        const isListed = settings.store.userList.includes(message.author.id);
        const isExempt = settings.store.shouldPingListed ? isListed : !isListed;
        return settings.store.inverseShiftReply ? isHoldingShift !== isExempt : !isHoldingShift && isExempt;
    },

    // todo: figure out what these are, name and type them accordingly
    togglePing(e: any, c: any, d: any) {
        let id = (c[e.channelId] ?? d[e.channelId])?.message?.author.id;
        if (id === undefined) return;
        if (settings.store.users === undefined) settings.store.users = {};
        settings.store.users[id] = e.shouldMention;
    },

    patches: [
        {
            find: ",\"Message\")}function",
            replacement: {
                match: /:(\i),shouldMention:!(\i)\.shiftKey/,
                replace: ":$1,shouldMention:$self.shouldMention($1,$2.shiftKey)"
            }
        },
        {
            find: "SET_PENDING_REPLY_SHOULD_MENTION:",
            replacement: {
                match: /(?=let{channelId:\i,shouldMention:\i}=(\i);)/,
                replace: "$self.togglePing($1, c, d);",
            },
        }
    ],
});
