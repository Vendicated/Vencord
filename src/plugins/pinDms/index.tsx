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
import { Forms } from "@webpack/common";

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

    Wrapper(props: { originalComponent: React.ComponentType<any>; }) {
        const original = <props.originalComponent {...props} />;

        const originalRender = original.type.render;
        original.type.render = (...args: any[]) => {
            const res = originalRender(...args);
            if (seen.has(res)) return res;
            seen.add(res);

            const container = findInReactTree(res, node => node?.props?.containerRef);
            const idx = container.props.children.findIndex(n => n?.props?.className?.startsWith("privateChannelsHeaderContainer"));
            container.props.children.splice(idx - 1, 0, <Forms.FormText>EXPLODE</Forms.FormText>);

            return res;
        };

        return original;
    }
});
