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
    authors: [Devs.Arjix, Devs.hunt, Devs.Ven],
    patches: [
        {
            find: '"MessageActionCreators"',
            replacement: {
                // editMessage: function (...) {
                match: /\beditMessage:(function\(.+?\))\{/,
                // editMessage: async function (...) { await handlePreEdit(...); ...
                replace: "editMessage:async $1{await Vencord.Api.MessageEvents._handlePreEdit(...arguments);"
            }
        },
        {
            find: ".handleSendMessage=",
            replacement: {
                // type: i.props.chatInputType...then((function...getSendMessageOptionsForReply(s); (?=...channelId: a.id, uplads: c, draftType:..., parsedMessage: d, options: ...)
                match: /(props\.chatInputType,.+?\.then\(\()(.+?getSendMessageOptionsForReply\(\i\);)(?=.+?channelId:(\i\.id),uploads:(\i),draftType:.+?,parsedMessage:(\i),options:(.+?)}\);)/,
                // type: i.props.chatInputType...then((async function...getSendMessageOptionsForReply(s); if (await handlePresend(channel.id, msg, options, uploads)) return{...};
                replace: (_, rest1, rest2, channelId, uploads, parsedMessage, options) => ""
                    + `${rest1}async ${rest2}`
                    + `if(await Vencord.Api.MessageEvents._handlePreSend(${channelId},${parsedMessage},${options},${uploads}))return{shouldClear:true,shouldRefocus:true};`
            }
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
