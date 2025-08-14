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
            find: "#{intl::EDIT_TEXTAREA_HELP}",
            replacement: {
                match: /(?<=,channel:\i\}\)\.then\().+?\i\.content!==this\.props\.message\.content&&\i\((.+?)\)\}(?=return)/,
                replace: (match, args) => "" +
                    `async ${match}` +
                    `if(await Vencord.Api.MessageEvents._handlePreEdit(${args}))` +
                    "return Promise.resolve({shouldClear:false,shouldRefocus:true});"
            }
        },
        {
            find: ".handleSendMessage,onResize:",
            replacement: {
                // https://regex101.com/r/7iswuk/1
                match: /let (\i)=\i\.\i\.parse\((\i),.+?\.getSendMessageOptions\(\{.+?\}\);(?=.+?(\i)\.flags=)(?<=\)\(({.+?})\)\.then.+?)/,
                replace: (m, parsedMessage, channel, replyOptions, extra) => m +
                    `if(await Vencord.Api.MessageEvents._handlePreSend(${channel}.id,${parsedMessage},${extra},${replyOptions}))` +
                    "return{shouldClear:false,shouldRefocus:true};"
            }
        },
        {
            find: '("interactionUsernameProfile',
            replacement: {
                match: /let\{id:\i}=(\i),{id:\i}=(\i);return \i\.useCallback\((\i)=>\{/,
                replace: (m, message, channel, event) =>
                    `const vcMsg=${message},vcChan=${channel};${m}Vencord.Api.MessageEvents._handleClick(vcMsg,vcChan,${event});`
            }
        }
    ]
});
