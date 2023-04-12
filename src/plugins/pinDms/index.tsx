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
import { ChannelStore } from "@webpack/common";
import { Channel } from "discord-types/general";

import { addContextMenus, removeContextMenus } from "./contextMenus";
import { getPinAt, isPinned, settings, usePinnedDms } from "./settings";

export default definePlugin({
    name: "PinDMs",
    description: "Allows you to pin private channels to the top of your DM list",
    authors: [Devs.Ven],

    settings,

    start: addContextMenus,
    stop: removeContextMenus,

    usePinCount() {
        const pinnedDms = usePinnedDms();
        return pinnedDms.size;
    },

    getChannel(idx: number) {
        return ChannelStore.getChannel(getPinAt(idx));
    },

    isPinned(channel?: Channel) {
        return channel && isPinned(channel.id);
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
                    match: /sections:\[\i,/,
                    replace: "$&$self.usePinCount(),"
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
                    match: /(?<=preRenderedChildren,(\i)=)(\i\[\i\[\i\]\]);/,
                    // section 1 is us, manually get our own channel
                    // additionally, if the channel is pinned and it's not our section, don't render
                    replace: "arguments[0]===1?$self.getChannel(arguments[1]):$2;if($self.isPinned($1)&&arguments[0]!==1)return null;"
                }
            ]
        }
    ],

    shouldHide(props: { channel: Channel, inPins?: boolean; }) {
        const pinnedDms = usePinnedDms();

        if (props.inPins) return false;
        if (!pinnedDms.has(props.channel.id)) return false;

        return !settings.store.showTwice;
    }
});
