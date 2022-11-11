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

import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";
import { SelectedChannelStore } from "../webpack/common";

const timers = {} as Record<string, {
    timeout?: NodeJS.Timeout;
    i: number;
}>;

export default definePlugin({
    name: "vcDoubleClick",
    description: "Join VCs via DoubleClick instead of single click",
    authors: [Devs.Ven, Devs.Nico],
    patches: [
        {
            find: "VoiceChannel.renderPopout",
            // hack: these are not React onClick, it is a custom prop handled by Discord
            // thus, replacing this with onDoubleClick won't work, and you also cannot check
            // e.detail since instead of the event they pass the channel.
            // do this timer workaround instead
            replacement: [
                // voice channels
                {
                    match: /onClick:(.*)function\(\)\{(e\.handleClick.+?)}/g,
                    replace: "onClick:$1function(){Vencord.Plugins.plugins.vcDoubleClick.schedule(()=>{$2}, e)}",
                },
                // stage channels
                {
                    match: /onClick:(.{0,15})this\.handleClick,/g,
                    replace: "onClick:$1(...args)=>Vencord.Plugins.plugins.vcDoubleClick.schedule(()=>{this.handleClick(...args);}, args[0]),",
                }
            ],
        },
        {
            find: 'className:"channelMention",iconType:(',
            replacement: {
                match: /onClick:(.{1,3}),/,
                replace: "onClick:(_vcEv)=>(_vcEv.detail>=2||_vcEv.target.className.includes('MentionText'))&&($1)(),",
            }
        }
    ],

    schedule(cb: () => void, e: any) {
        // support from stage and voice channels patch
        const id = e?.id ?? e.props.channel.id as string;
        if (SelectedChannelStore.getVoiceChannelId() === id) {
            cb();
            return;
        }
        // use a different counter for each channel
        const data = (timers[id] ??= { timeout: void 0, i: 0 });
        // clear any existing timer
        clearTimeout(data.timeout);

        // if we already have 2 or more clicks, run the callback immediately
        if (++data.i >= 2) {
            cb();
            delete timers[id];
        } else {
            // else reset the counter in 500ms
            data.timeout = setTimeout(() => {
                delete timers[id];
            }, 500);
        }
    }
});
