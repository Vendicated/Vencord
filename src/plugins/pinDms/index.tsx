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
import { getPinAt, settings, usePinnedDms } from "./settings";

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

    patches: [
        // Patch DM list
        {
            find: ".privateChannelsHeaderContainer,",
            replacement: [
                {
                    match: /sections:\[\i,/,
                    replace: "$&$self.usePinCount(),"
                },
                {
                    match: /children:(\i\.\i\.Messages.DIRECT_MESSAGES)(?<=renderSection=function\((\i)\).+?)/,
                    replace: "children:$2.section===1?'Pinned DMs':$1"
                },
                {
                    // inside renderDM: channel=channels[channelIds[row]]
                    match: /(?<=preRenderedChildren,\i=)(\i\[\i\[\i\]\])/,
                    // section 1 is us, manually get our own channel
                    replace: "arguments[0]===1?$self.getChannel(arguments[1]):$1"
                },
                {
                    match: /channel:\i,selected:/,
                    replace: "inPins:arguments[0]===1,$&"
                }
            ]
        },
        // Patch the DM & DMGroup components to not render pinned dms in the regular dm list
        {
            find: ".handleLeaveGroup=",
            replacement: {
                // return React.createElement(Component, { channel: c, channelName: n
                match: /return(?=\(0,\i\.jsxs?\)\(\i,\i\(\{channel:\i,channelName:\i)/g,
                replace: "return $self.shouldHide(arguments[0])?null:"
            }
        }
    ],

    shouldHide(props: { channel: Channel, inPins?: boolean; }) {
        const pinnedDms = usePinnedDms();

        if (props.inPins) return false;
        if (!pinnedDms.has(props.channel.id)) return false;

        return !settings.store.showTwice;
    }
});
