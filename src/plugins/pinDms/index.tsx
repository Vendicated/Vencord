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
import { getPinAt, isPinned, snapshotArray, usePinnedDms } from "./settings";

export default definePlugin({
    name: "PinDMs",
    description: "Allows you to pin private channels to the top of your DM list. To pin/unpin or reorder pins, right click DMs",
    authors: [Devs.Ven, Devs.Strencher],

    dependencies: ["ContextMenuAPI"],

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

    isPinned,
    getSnapshot: () => snapshotArray,

    shouldHide(section: number, channel?: Channel) {
        if (!channel) return true;
        if (section === 1) return false;
        return isPinned(channel.id);
    },

    makeScrollToChannel: (rowHeight: number) => function (this: any, channelId: string) {
        // this is a reimplementation of Discord's function that also accounts for pinned channels
        const {
            _list,
            props: { padding, privateChannelIds },
            state: { preRenderedChildren }
        } = this;

        if (!_list) return;
        if (!channelId) {
            return _list.scrollTo({ to: 0 });
        }

        const snapshot = snapshotArray!;

        let offset: number = rowHeight * preRenderedChildren + padding;

        if (isPinned(channelId)) {
            offset += snapshot.indexOf(channelId) * rowHeight;
        } else {
            // Add the height of all pins first
            offset += rowHeight * snapshot.length;
            let found = false;

            for (let i = 0, inc = 0; i < privateChannelIds.length; i++) {
                const c = privateChannelIds[i];
                if (c === channelId) {
                    found = true;
                    offset += inc * rowHeight;
                    break;
                } else if (!isPinned(c)) {
                    // only increment for non pinned, as pinned dms aren't actually rendered here
                    inc++;
                }
            }

            if (!found) {
                return _list.scrollTo({ to: 0 });
            }
        }

        // this is just verbatim copy pasted from Discord's code
        _list.scrollIntoViewRect({
            start: Math.max(offset - 8, 0),
            end: offset + rowHeight + 8
        });
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
                },
                {
                    // Override scrollToChannel to properly account for pinned channels
                    match: /scrollToChannel=(?=function.+?end:\i\+(\i)\+8)/,
                    replace: "scrollToChannel=$self.makeScrollToChannel($1);var yeetedScrollToChannel="
                }
            ]
        },

        // Fix Alt Up/Down navigation
        {
            find: '"mod+alt+right"',
            replacement: {
                // channelIds = __OVERLAY__ ? stuff : toArray(getStaticPaths()).concat(toArray(channelIds))
                match: /(?<=(\i)=__OVERLAY__\?\i:.{0,10})\.concat\((.{0,10})\)/,
                // ....concat(pins).concat(toArray(channelIds).filter(c => !isPinned(c)))
                replace: ".concat($self.getSnapshot()).concat($2.filter(c=>!$self.isPinned(c)))"
            }
        }
    ]
});
