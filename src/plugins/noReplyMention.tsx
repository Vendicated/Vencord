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

import { Settings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { Message } from "discord-types/general";

export default definePlugin({
    name: "NoReplyMention",
    description: "Disables reply pings by default",
    authors: [Devs.DustyAngel47, Devs.axyie, Devs.pylix],
    options: {
        exemptList: {
            description:
                "List of users to exempt from this plugin (separated by commas or spaces)",
            type: OptionType.STRING,
            default: "1234567890123445,1234567890123445",
        },
        inverseShiftReply: {
            description: "Inverse shift replying behaviour",
            type: OptionType.BOOLEAN,
            default: false,
        }
    },
    shouldMention(message: Message, holdingShift: boolean) {
        const { exemptList, inverseShiftReply } = Settings.plugins.NoReplyMention;

        const isExempted = exemptList.includes(message.author.id);
        return inverseShiftReply ? holdingShift !== isExempted : isExempted;
    },
    patches: [
        {
            find: ",\"Message\")}function",
            replacement: {
                match: /:(.{1,2}),shouldMention:!(.{1,2})\.shiftKey/,
                replace: ":$1,shouldMention:$self.shouldMention($1, $2.shiftKey)"
            }
        }
    ],
});
