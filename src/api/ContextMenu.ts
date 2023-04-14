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

import Logger from "@utils/Logger";
import type { ReactElement } from "react";

type ContextMenuPatchCallbackReturn = (() => void) | void;
/**
 * @param children The rendered context menu elements
 * @param args Any arguments passed into making the context menu, like the guild, channel, user or message for example
 * @returns A callback which is only ran once used to modify the context menu elements (Use to avoid duplicates)
 */
export type NavContextMenuPatchCallback = (children: Array<React.ReactElement>, ...args: Array<any>) => ContextMenuPatchCallbackReturn;
/**
 * @param navId The navId of the context menu being patched
 * @param children The rendered context menu elements
 * @param args Any arguments passed into making the context menu, like the guild, channel, user or message for example
 * @returns A callback which is only ran once used to modify the context menu elements (Use to avoid duplicates)
 */
export type GlobalContextMenuPatchCallback = (navId: string, children: Array<React.ReactElement>, ...args: Array<any>) => ContextMenuPatchCallbackReturn;

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
 * @returns Wheter the patch was sucessfully removed from the context menu(s)
 */
export function removeContextMenuPatch<T extends string | Array<string>>(navId: T, patch: NavContextMenuPatchCallback): T extends string ? boolean : Array<boolean> {
    const navIds = Array.isArray(navId) ? navId : [navId as string];

    const results = navIds.map(id => navPatches.get(id)?.delete(patch) ?? false);

    return (Array.isArray(navId) ? results : results[0]) as T extends string ? boolean : Array<boolean>;
}

/**
 * Remove a global context menu patch
 * @param patch The patch to be removed
 * @returns Wheter the patch was sucessfully removed
 */
export function removeGlobalContextMenuPatch(patch: GlobalContextMenuPatchCallback): boolean {
    return globalPatches.delete(patch);
}

/**
 * A helper function for finding the children array of a group nested inside a context menu based on the id of one of its childs
 * @param id The id of the child
 * @param children The context menu children
 */
export function findGroupChildrenByChildId(id: string, children: Array<React.ReactElement>, _itemsArray?: Array<React.ReactElement>): Array<React.ReactElement> | null {
    for (const child of children) {
        if (child == null) continue;

        if (child.props?.id === id) return _itemsArray ?? null;

        let nextChildren = child.props?.children;
        if (nextChildren) {
            if (!Array.isArray(nextChildren)) {
                nextChildren = [nextChildren];
                child.props.children = nextChildren;
            }

            const found = findGroupChildrenByChildId(id, nextChildren, nextChildren);
            if (found !== null) return found;
        }
    }

    return null;
}

interface ContextMenuProps {
    contextMenuApiArguments?: Array<any>;
    navId: string;
    children: Array<ReactElement>;
    "aria-label": string;
    onSelect: (() => void) | undefined;
    onClose: (callback: (...args: Array<any>) => any) => void;
}

const patchedMenus = new WeakSet();

export function _patchContextMenu(props: ContextMenuProps) {
    props.contextMenuApiArguments ??= [];
    const contextMenuPatches = navPatches.get(props.navId);

    if (!Array.isArray(props.children)) props.children = [props.children];

    if (contextMenuPatches) {
        for (const patch of contextMenuPatches) {
            try {
                const callback = patch(props.children, ...props.contextMenuApiArguments);
                if (!patchedMenus.has(props)) callback?.();
            } catch (err) {
                ContextMenuLogger.error(`Patch for ${props.navId} errored,`, err);
            }
        }
    }

    for (const patch of globalPatches) {
        try {
            const callback = patch(props.navId, props.children, ...props.contextMenuApiArguments);
            if (!patchedMenus.has(props)) callback?.();
        } catch (err) {
            ContextMenuLogger.error("Global patch errored,", err);
        }
    }

    patchedMenus.add(props);
}
