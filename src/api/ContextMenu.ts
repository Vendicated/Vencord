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
import React from "react";

export type ContextMenuPatchCallback = (children: Array<React.ReactElement>, args?: Array<any>) => void;

const ContextMenuLogger = new Logger("ContextMenu");

export const patches = new Map<string, Set<ContextMenuPatchCallback>>();

/**
 * Add a context menu patch
 * @param navId The navId(s) for the context menu(s) to patch
 * @param patch The patch to be applied
 */
export function addContextMenuPatch(navId: string | Array<string>, patch: ContextMenuPatchCallback) {
    if (!Array.isArray(navId)) navId = [navId];
    for (const id of navId) {
        let contextMenuPatches = patches.get(id);
        if (!contextMenuPatches) {
            contextMenuPatches = new Set();
            patches.set(id, contextMenuPatches);
        }

        contextMenuPatches.add(patch);
    }
}

/**
 * Remove a context menu patch
 * @param navId The navId(s) for the context menu(s) to remove the patch
 * @param patch The patch to be removed
 * @returns Wheter the patch was sucessfully removed from the context menu(s)
 */
export function removeContextMenuPatch<T extends string | Array<string>>(navId: T, patch: ContextMenuPatchCallback): T extends string ? boolean : Array<boolean> {
    const navIds = Array.isArray(navId) ? navId : [navId as string];

    const results: Array<boolean> = [];
    for (const id of navIds) {
        results.push(patches.get(id)?.delete(patch) ?? false);
    }

    return (Array.isArray(navId) ? results : results[0]) as T extends string ? boolean : Array<boolean>;
}

/**
 * A helper function for finding the children array of a group nested inside a context menu based on the id of one of its childs
 * @param id The id of the child
 */
export function findGroupChildrenByChildId(id: string, children: Array<React.ReactElement>, itemsArray?: Array<React.ReactElement>): Array<React.ReactElement> | null {
    for (const child of children) {
        if (child === null) continue;

        if (child.props?.id === id) return itemsArray ?? null;

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
    contextMenuAPIArguments?: Array<any>;
    navId: string;
    children: Array<React.ReactElement>;
    "aria-label": string;
    onSelect: (() => void) | undefined;
    onClose: (callback: (...args: Array<any>) => any) => void;
}

export function _patchContextMenu(props: ContextMenuProps) {
    const contextMenuPatches = patches.get(props.navId);

    if (contextMenuPatches) {
        for (const patch of contextMenuPatches) {
            try {
                patch(props.children, props.contextMenuAPIArguments);
            } catch (err) {
                ContextMenuLogger.error(`Patch for ${props.navId} errored,`, err);
            }
        }
    }
}
