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

import { Logger } from "@utils/Logger";
import { canonicalizeMatch } from "@utils/patches";
import { Menu, React } from "@webpack/common";
import type { ReactElement } from "react";

// duplicate values have multiple branches with different types. Just include all to be safe
const nameMap = {
    radio: "MenuRadioItem",
    separator: "MenuSeparator",
    checkbox: "MenuCheckboxItem",
    groupstart: "MenuGroup",

    control: "MenuControlItem",
    compositecontrol: "MenuControlItem",

    item: "MenuItem",
    customitem: "MenuItem",
};


/**
 * @param children The rendered context menu elements
 * @param args Any arguments passed into making the context menu, like the guild, channel, user or message for example
 */
export type NavContextMenuPatchCallback = (children: Array<ReactElement<any> | null>, ...args: Array<any>) => void;
/**
 * @param navId The navId of the context menu being patched
 * @param children The rendered context menu elements
 * @param args Any arguments passed into making the context menu, like the guild, channel, user or message for example
 */
export type GlobalContextMenuPatchCallback = (navId: string, children: Array<ReactElement<any> | null>, ...args: Array<any>) => void;

const ContextMenuLogger = new Logger("ContextMenu");

export const navPatches = new Map<string, Set<NavContextMenuPatchCallback>>();
export const globalPatches = new Set<GlobalContextMenuPatchCallback>();

/**
 * Add a context menu patch
 * @param navId The navId(s) for the context menu(s) to patch
 * @param patch The patch to be applied
 */
export function addContextMenuPatch(navId: string | Array<string>, patch: NavContextMenuPatchCallback) {
    if (!Array.isArray(navId)) navId = [navId];
    for (const id of navId) {
        let contextMenuPatches = navPatches.get(id);
        if (!contextMenuPatches) {
            contextMenuPatches = new Set();
            navPatches.set(id, contextMenuPatches);
        }

        contextMenuPatches.add(patch);
    }
}

/**
 * Add a global context menu patch that fires the patch for all context menus
 * @param patch The patch to be applied
 */
export function addGlobalContextMenuPatch(patch: GlobalContextMenuPatchCallback) {
    globalPatches.add(patch);
}

/**
 * Remove a context menu patch
 * @param navId The navId(s) for the context menu(s) to remove the patch
 * @param patch The patch to be removed
 * @returns Whether the patch was successfully removed from the context menu(s)
 */
export function removeContextMenuPatch<T extends string | Array<string>>(navId: T, patch: NavContextMenuPatchCallback): T extends string ? boolean : Array<boolean> {
    const navIds: string[] = Array.isArray(navId) ? navId : [navId];

    const results = navIds.map(id => navPatches.get(id)?.delete(patch) ?? false);

    return (Array.isArray(navId) ? results : results[0]) as T extends string ? boolean : Array<boolean>;
}

/**
 * Remove a global context menu patch
 * @param patch The patch to be removed
 * @returns Whether the patch was successfully removed
 */
export function removeGlobalContextMenuPatch(patch: GlobalContextMenuPatchCallback): boolean {
    return globalPatches.delete(patch);
}

/**
 * A helper function for finding the children array of a group nested inside a context menu based on the id(s) of its children
 * @param id The id of the child. If an array is specified, all ids will be tried
 * @param children The context menu children
 * @param matchSubstring Whether to check if the id is a substring of the child id
 */
export function findGroupChildrenByChildId(id: string | string[], children: Array<ReactElement<any> | null | undefined>, matchSubstring = false): Array<ReactElement<any> | null | undefined> | null {
    for (const child of children) {
        if (child == null) continue;

        if (Array.isArray(child)) {
            const found = findGroupChildrenByChildId(id, child, matchSubstring);
            if (found !== null) return found;
        }

        if (
            (Array.isArray(id) && id.some(id => matchSubstring ? child.props?.id?.includes(id) : child.props?.id === id))
            || (matchSubstring ? child.props?.id?.includes(id) : child.props?.id === id)
        ) return children;

        let nextChildren = child.props?.children;
        if (nextChildren) {
            if (!Array.isArray(nextChildren)) {
                nextChildren = [nextChildren];
                child.props.children = nextChildren;
            }

            const found = findGroupChildrenByChildId(id, nextChildren, matchSubstring);
            if (found !== null) return found;
        }
    }

    return null;
}

interface ContextMenuProps {
    contextMenuAPIArguments?: Array<any>;
    navId: string;
    children: Array<ReactElement<any> | null>;
    "aria-label": string;
    onSelect: (() => void) | undefined;
    onClose: (callback: (...args: Array<any>) => any) => void;
}

export function _usePatchContextMenu(props: ContextMenuProps) {
    if (!Menu.MenuItem) return props; // Prevent crashes in case we fail to acquire menu items for some reason

    props = {
        ...props,
        children: cloneMenuChildren(props.children),
    };

    props.contextMenuAPIArguments ??= [];
    const contextMenuPatches = navPatches.get(props.navId);

    if (!Array.isArray(props.children)) props.children = [props.children];

    if (contextMenuPatches) {
        for (const patch of contextMenuPatches) {
            try {
                patch(props.children, ...props.contextMenuAPIArguments);
            } catch (err) {
                ContextMenuLogger.error(`Patch for ${props.navId} errored,`, err);
            }
        }
    }

    for (const patch of globalPatches) {
        try {
            patch(props.navId, props.children, ...props.contextMenuAPIArguments);
        } catch (err) {
            ContextMenuLogger.error("Global patch errored,", err);
        }
    }

    return props;
}

function cloneMenuChildren(obj: ReactElement<any> | Array<ReactElement<any> | null> | null) {
    if (Array.isArray(obj)) {
        return obj.map(cloneMenuChildren);
    }

    if (React.isValidElement(obj)) {
        obj = React.cloneElement(obj);

        if (
            obj?.props?.children &&
            (obj.type !== Menu.MenuControlItem || obj.type === Menu.MenuControlItem && obj.props.control != null)
        ) {
            obj.props.children = cloneMenuChildren(obj.props.children);
        }
    }

    return obj;
}

export const contextMenuInjectorPatches = [
    {
        find: "navId:",
        all: true,
        noWarn: true,
        replacement: [
            {
                match: /navId:(?=.+?([,}].*?\)))/g,
                replace: (m, rest) => {
                    // Check if this navId: match is a destructuring statement, ignore it if it is
                    const destructuringMatch = rest.match(/}=.+/);
                    if (destructuringMatch == null) {
                        return `contextMenuAPIArguments:typeof arguments!=='undefined'?arguments:[],${m}`;
                    }
                    return m;
                }
            }
        ]
    },

    {
        find: "Menu API only allows Items",
        replacement: [
            // Patch the central context menu handler
            {
                match: /(?=let{navId:)(?<=function \i\((\i)\).+?)/,
                replace: "$1=Vencord.Api.ContextMenu._usePatchContextMenu($1);"
            },

            // Demangle Discord's Menu Item module
            {
                match: /(?<=(\(\i\.type===(\i\.\i)\).{0,50}?navigable:.+Menu API).+?)}$/s,
                replace: (_, m) => {
                    const registerCalls = [] as string[];

                    const typeCheckRe = canonicalizeMatch(/\(\i\.type===(\i\.\i)\)/g); // if (t.type === m.MenuItem)
                    const pushTypeRe = /type:"(\w+)"/g; // push({type:"item"})

                    let typeMatch: RegExpExecArray | null;
                    while ((typeMatch = typeCheckRe.exec(m)) !== null) {
                        const component = typeMatch[1];
                        // Set the starting index of the second regex to that of the first to start
                        // matching from after the if
                        pushTypeRe.lastIndex = typeCheckRe.lastIndex;

                        // extract the first type: "..."
                        const type = pushTypeRe.exec(m)?.[1];
                        if (type && type in nameMap) {
                            const name = nameMap[type];
                            registerCalls.push(`$self.registerMenuItem("${name}",${component})`);
                        }
                    }

                    if (registerCalls.length < 6) {
                        console.warn("[MenuItemDemanglerAPI] Expected to remap 6 items, only remapped", registerCalls.length);
                    }

                    return `${registerCalls.join(";")};}`;
                },
            }
        ],
    },
];
