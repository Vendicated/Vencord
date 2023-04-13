/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
import { Channel } from "discord-types/general";

import { addContextMenus, removeContextMenus } from "./contextMenus";
import { getPinAt, isPinned, usePinnedDms } from "./settings";

export default definePlugin({
    name: "PinDMs",
    description: "Allows you to pin private channels to the top of your DM list",
    authors: [Devs.Ven],

    start: addContextMenus,
    stop: removeContextMenus,

    usePinCount(channelIds: string[]) {
        const pinnedDms = usePinnedDms();
        // See comment on first patch for reasoning
        return channelIds.length ? [pinnedDms.size] : [];
    },

    getChannel(channels: Record<string, Channel>, idx: number) {
        return channels[getPinAt(idx)];
    },

    shouldHide(section: number, channel?: Channel) {
        if (!channel) return true;
        if (section === 1) return false;
        return isPinned(channel.id);
    },

    patches: [
        // Patch DM list
        {
            find: ".privateChannelsHeaderContainer,",
            replacement: [
                {
                    // sections is an array of numbers, where each element is a section and
                    // the number is the amount of rows. Add our pinCount in second place
                    // - Section 1: buttons for pages like Friends & Library
                    // - Section 2: our pinned dms
                    // - Section 3: the normal dm list
                    match: /sections:\[\i(?=,Math\.max\((\i)\.length)/,
                    // For some reason, adding our sections when no private channels are ready yet
                    // makes DMs infinitely load. Thus usePinCount returns either a single element
                    // array with the count, or an empty array. Due to spreading, only in the former
                    // case will an element be added to the outer array
                    // Thanks for the fix, Strencher!
                    replace: "$&,...$self.usePinCount($1)"
                },
                {
                    // Patch renderSection (renders the header) to set the text to "Pinned DMs" instead of "Direct Messages"
                    // lookbehind is used to lookup parameter name. We could use arguments[0], but
                    // if children ever is wrapped in an iife, it will break
                    match: /children:(\i\.\i\.Messages.DIRECT_MESSAGES)(?<=renderSection=function\((\i)\).+?)/,
                    replace: "children:$2.section===1?'Pinned DMs':$1"
                },
                {
                    // Patch channel lookup inside renderDM
                    // channel=channels[channelIds[row]];
                    match: /(?<=preRenderedChildren,(\i)=)((\i)\[\i\[\i\]\]);/,
                    // section 1 is us, manually get our own channel
                    // additionally, if the channel is pinned and it's not our section, don't render
                    // section === 1 ? getChannel(channels, row) : channels[channelIds[row]]; if (shouldHide(section, channel)) return null;
                    replace: "arguments[0]===1?$self.getChannel($3,arguments[1]):$2;if($self.shouldHide(arguments[0],$1))return null;"
                },
                {
                    // Fix getRowHeight's check for whether this is the DMs section
                    // section === DMS
                    match: /===\i.DMS&&0/,
                    // section -1 === DMS
                    replace: "-1$&"
                }
            ]
        }
    ]
});
