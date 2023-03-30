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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "MessageEventsAPI",
    description: "Api required by anything using message events.",
    authors: [Devs.Arjix, Devs.hunt],
    patches: [
        {
            find: '"MessageActionCreators"',
            replacement: [{
                match: /_sendMessage:(function\([^)]+\)){/,
                replace: "_sendMessage:async $1{if(await Vencord.Api.MessageEvents._handlePreSend(...arguments))return;"
            }, {
                match: /\beditMessage:(function\([^)]+\)){/,
                replace: "editMessage:async $1{await Vencord.Api.MessageEvents._handlePreEdit(...arguments);"
            }]
        },
        {
            find: '("interactionUsernameProfile',
            replacement: {
                match: /var \i=(\i)\.id,\i=(\i)\.id;return \i\.useCallback\(\(?function\((\i)\){/,
                replace: (m, message, channel, event) =>
                    // the message param is shadowed by the event param, so need to alias them
                    `var _msg=${message},_chan=${channel};${m}Vencord.Api.MessageEvents._handleClick(_msg, _chan, ${event});`
            }
        }
    ]
});
