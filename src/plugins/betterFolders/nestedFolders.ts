/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
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

export type NestedFolderMap = Record<string, string>;

export function getChildFolderIds(map: NestedFolderMap, parentId: string | number): string[] {
    return Object.entries(map)
        .filter(([, id]) => id === String(parentId))
        .map(([id]) => id);
}

export function hasParentInChain(map: NestedFolderMap, childId: string, parentId: string): boolean {
    const seen = new Set<string>();
    let current = map[childId];

    while (current != null && !seen.has(current)) {
        if (current === parentId) return true;
        seen.add(current);
        current = map[current];
    }

    return false;
}

export function areNestedRelated(map: NestedFolderMap, firstId: string, secondId: string): boolean {
    return hasParentInChain(map, firstId, secondId) || hasParentInChain(map, secondId, firstId);
}

export function getAncestorFolderIds(map: NestedFolderMap, childId: string | number): string[] {
    const ancestors: string[] = [];
    const seen = new Set<string>([String(childId)]);
    let current = map[String(childId)];

    while (current != null && !seen.has(current)) {
        ancestors.push(current);
        seen.add(current);
        current = map[current];
    }

    return ancestors;
}

export function getDescendantFolderIds(map: NestedFolderMap, parentId: string | number): string[] {
    const descendants: string[] = [];
    const rootId = String(parentId);
    const seen = new Set<string>([rootId]);
    const queue = [...getChildFolderIds(map, parentId)];

    while (queue.length) {
        const current = queue.shift();
        if (!current || seen.has(current)) continue;

        seen.add(current);
        descendants.push(current);
        queue.push(...getChildFolderIds(map, current));
    }

    return descendants;
}

export function sanitizeNestedFolderMap(map: NestedFolderMap, validFolderIds: Set<string>): NestedFolderMap {
    const sanitized: NestedFolderMap = {};

    for (const [childId, parentId] of Object.entries(map)) {
        if (!validFolderIds.has(childId) || !validFolderIds.has(parentId)) continue;
        if (childId === parentId) continue;
        delete sanitized[childId];
        if (hasParentInChain(sanitized, parentId, childId)) continue;

        sanitized[childId] = parentId;
    }

    return sanitized;
}
