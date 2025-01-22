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
                match: /(?<=,channel:\i\}\)\.then\().+?(?=return \i\.content!==this\.props\.message\.content&&\i\((.+?)\))/,
                replace: (match, args) => "" +
                    `async ${match}` +
                    `if(await Vencord.Api.MessageEvents._handlePreEdit(${args}))` +
                    "return Promise.resolve({shouldClear:false,shouldRefocus:true});"
            }
        },
        {
            find: ".handleSendMessage,onResize",
            replacement: {
                // props.chatInputType...then((function(isMessageValid)... var parsedMessage = b.c.parse(channel,... var replyOptions = f.g.getSendMessageOptionsForReply(pendingReply);
                // Lookbehind: validateMessage)({openWarningPopout:..., type: i.props.chatInputType, content: t, stickers: r, ...}).then((function(isMessageValid)
                match: /(\{openWarningPopout:.{0,100}type:this.props.chatInputType.+?\.then\()(\i=>\{.+?let (\i)=\i\.\i\.parse\((\i),.+?let (\i)=\i\.\i\.getSendMessageOptions\(\{.+?\}\);)(?<=\)\(({.+?})\)\.then.+?)/,
                // props.chatInputType...then((async function(isMessageValid)... var replyOptions = f.g.getSendMessageOptionsForReply(pendingReply); if(await Vencord.api...) return { shoudClear:true, shouldRefocus:true };
                replace: (_, rest1, rest2, parsedMessage, channel, replyOptions, extra) => "" +
                    `${rest1}async ${rest2}` +
                    `if(await Vencord.Api.MessageEvents._handlePreSend(${channel}.id,${parsedMessage},${extra},${replyOptions}))` +
                    "return{shouldClear:false,shouldRefocus:true};"
            }
        },
        {
            find: '("interactionUsernameProfile',
            replacement: {
                match: /let\{id:\i}=(\i),{id:\i}=(\i);return \i\.useCallback\((\i)=>\{/,
                replace: (m, message, channel, event) =>
                    // the message param is shadowed by the event param, so need to alias them
                    `const vcMsg=${message},vcChan=${channel};${m}Vencord.Api.MessageEvents._handleClick(vcMsg, vcChan, ${event});`
            }
        }
    ]
});
