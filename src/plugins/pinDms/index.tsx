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
import { LazyComponent } from "@utils/misc";
import definePlugin from "@utils/types";
import { filters, find, findByCode, findByPropsLazy } from "@webpack";
import { ChannelStore } from "@webpack/common";

const classes = findByPropsLazy("privateChannelsHeaderContainer");
const DMComponent = LazyComponent(() => findByCode("getRecipientId()", "isFavorite"));
const dmGroupFilter = filters.byCode("isFavorite:", "channelName:");
const DMGroupComponent = LazyComponent(() => find(m => dmGroupFilter(m) && !filters.byCode("getRecipientId")(m)));

function walkChildren(node: any, fn: (node: any) => false | void): boolean {
    if (fn(node) === false) return false;

    if (node?.props?.children) {
        if (Array.isArray(node.props.children)) {
            for (const child of node.props.children) {
                if (walkChildren(child, fn) === false)
                    return false;
            }
        } else {
            return walkChildren(node.props.children, fn);
        }
    }

    return true;
}

function findInReactTree(root: any, filter: (node: any) => boolean) {
    if (filter(root)) return root;

    let found: any = null;
    walkChildren(root, node => {
        if (filter(node)) {
            found = node;
            return false;
        }
    });

    return found;
}

const pins = ["845052403802964019", "941031948762112050"];

function PinnedDmsComponent() {
    return (
        <>
            {/* Have to hardcode this class because it is exported by a module that only contains container
             (and there's dozens of those, so it's impossible to find) */}
            <h2 className={`${classes.privateChannelsHeaderContainer} container-q97qHp`}>Pinned DMs</h2>
            {pins.map(p => {
                const channel = ChannelStore.getChannel(p);
                if (!channel) return null;

                const Component = channel.isMultiUserDM() ? DMGroupComponent : DMComponent;

                return <Component
                    key={channel.id}
                    channel={channel}
                    selected={false}
                />;
            })}
        </>
    );
}

const seen = new WeakSet();


export default definePlugin({
    name: "PinDMs",
    description: "Allows you to pin private channels to the top of your DM list.",
    authors: [Devs.Ven],

    patches: [
        {
            find: ".privateChannelsHeaderContainer,",
            replacement: {
                match: /(?<=FocusJumpSection,\{children:function\(\i\)\{return\s*\(0,\i\.jsxs?\)\()(.+?),(\i)\(\{/,
                replace: "$self.Wrapper,$2({originalComponent:$1,"
            }
        }
    ],

    Wrapper(props: { originalComponent: React.ComponentType<any>; selectedChannelId: string; }) {
        const original = <props.originalComponent {...props} />;

        const originalRender = original.type.render;
        original.type.render = (...args: any[]) => {
            const res = originalRender(...args);
            if (seen.has(res)) return res;
            seen.add(res);

            const container = findInReactTree(res, node => node?.props?.containerRef);
            const idx = container.props.children.findIndex(n => n?.props?.className?.startsWith("privateChannelsHeaderContainer"));
            if (idx !== -1)
                container.props.children.splice(idx - 1, 0, <PinnedDmsComponent />);

            return res;
        };

        return original;
    }
});
