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

function walkReactTree(node: any, fn: (node: any) => false | void): boolean {
    if (fn(node) === false) return false;

    if (node?.props?.children) {
        if (Array.isArray(node.props.children)) {
            for (const child of node.props.children) {
                if (walkReactTree(child, fn) === false)
                    return false;
            }
        } else {
            return walkReactTree(node.props.children, fn);
        }
    }

    return true;
}

export function findInReactTree(root: any, filter: (node: any) => boolean) {
    if (filter(root)) return root;

    let found: any = null;
    walkReactTree(root, node => {
        if (filter(node)) {
            found = node;
            return false;
        }
    });

    return found;
}
