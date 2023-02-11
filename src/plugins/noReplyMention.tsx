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

interface Reply {
    message: {
        author: {
            id: string;
        };
    };
}

export default definePlugin({
    name: "NoReplyMention",
    description: "Disables reply pings by default",
    authors: [Devs.DustyAngel47, Devs.axyie],
    options: {
        exemptList: {
            description:
                "List of users to exempt from this plugin (separated by commas)",
            type: OptionType.STRING,
            default: "1234567890123445,1234567890123445",
        },
    },
    shouldMention(reply: Reply) {
        return Settings.plugins.NoReplyMention.exemptList.includes(
            reply.message.author.id
        );
    },
    patches: [
        {
            find: "CREATE_PENDING_REPLY:function",
            replacement: {
                match: /CREATE_PENDING_REPLY:function\((.{1,2})\){/,
                replace:
                    "CREATE_PENDING_REPLY:function($1){$1.shouldMention=$self.shouldMention($1);",
            },
        },
    ],
});
