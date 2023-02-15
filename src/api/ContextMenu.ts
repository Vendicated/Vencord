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

import React from "react";

type PatchCallback = (children: Array<React.ReactElement>, args?: Array<any>) => Array<any>;


const patches = new Map<string, Set<PatchCallback>>();

export function addContextMenuPatch(navId: string, patch: PatchCallback) {
    let contextMenuPatches = patches.get(navId);
    if (!contextMenuPatches) {
        contextMenuPatches = new Set();
        patches.set(navId, contextMenuPatches);
    }

    contextMenuPatches.add(patch);
}

export function removeContextMenuPatch(navId: string, patch: PatchCallback) {
    patches.get(navId)?.delete(patch);
}

/**
 * A helper function for finding a group nested inside a context menu based on the id of one of its childs
 * @param id The id of the child
 */
export function findGroupByChildId(id: string, children: Array<React.ReactElement>, parent?: React.ReactElement): React.ReactElement | null {
    for (const child of children) {
        if (child === null) continue;

        if (child.props?.id === id) return parent ?? null;

        const nextChildren = child.props?.children;
        if (nextChildren) {
            const found = findGroupByChildId(id, Array.isArray(nextChildren) ? nextChildren : [nextChildren], child);
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
            patch(props.children, props.contextMenuAPIArguments);
        }
    }
}
