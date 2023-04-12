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

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import Logger from "@utils/Logger";
import definePlugin from "@utils/types";
import { Channel } from "discord-types/general";

import { addContextMenus, removeContextMenus } from "./contextMenus";
import PinnedDmsComponent from "./PinnedDMsComponent";
import { settings, usePinnedDms } from "./settings";
import { findInReactTree } from "./walk";

const seen = new WeakSet();

export default definePlugin({
    name: "PinDMs",
    description: "Allows you to pin private channels to the top of your DM list",
    authors: [Devs.Ven],

    settings,

    start: addContextMenus,
    stop: removeContextMenus,

    patches: [
        // Patch DM list
        {
            find: ".privateChannelsHeaderContainer,",
            replacement: {
                // children: function(i) { return React.createElement(Component, someFunc({
                match: /(?<=FocusJumpSection,\{children:function\(\i\)\{return\s*\(0,\i\.jsxs?\)\()(.+?),(\i)\(\{/,
                // children: function(i) { return React.createElement(OurWrapper, someFunc({ originalComponent: Component
                replace: "$self.Wrapper,$2({originalComponent:$1,"
            }
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
    },

    Wrapper: ErrorBoundary.wrap((props: { originalComponent: React.ComponentType<any>; selectedChannelId: string; }) => {
        const original = <props.originalComponent {...props} />;

        const originalRender = original.type.render;
        original.type.render = (...args: any[]) => {
            const res = originalRender(...args);
            try {
                if (seen.has(res)) return res;
                seen.add(res);

                const container = findInReactTree(res, node => node?.props?.containerRef);
                const idx = container.props.children.findIndex(n => n?.props?.className?.startsWith("privateChannelsHeaderContainer"));
                if (idx !== -1)
                    container.props.children.splice(
                        idx - 1,
                        0,
                        <PinnedDmsComponent />
                    );

            } catch (e) {
                new Logger("PinDMs").error("Failed to patch DM list", e);
            }

            return res;
        };

        return original;
    })
});
