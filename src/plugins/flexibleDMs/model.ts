/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Folder {
    id: string;
    name: string;
    color: string;
    channels: string[];
    expanded: boolean;
    naturalOrder?: boolean;
}

export interface Layout {
    folders: Folder[];
    order: string[];
    seen: Record<string, string>;
}

export interface Row {
    id: string;
    folder?: Folder;
    parent?: Folder;
}

export const DEFAULT_FOLDER_COLOR = "#5865f2";

export type Placement = "before" | "inside" | "after";
export const emptyLayout = (): Layout => ({ folders: [], order: [], seen: {} });

function compareIds(a = "0", b = "0") {
    return a.length - b.length || a.localeCompare(b);
}

/** Keep closed DMs in saved membership, but only render channels Discord lists. */
export function getRows(layout: Layout, activeIds: string[], messages: Record<string, string>, keepOnTop: boolean): Row[] {
    const active = new Set(activeIds);
    const folders = layout.folders.filter(f => f.channels.some(id => active.has(id)));
    const parents = new Map(folders.flatMap(f => f.channels.map(id => [id, f] as const)));
    const byId = new Map(folders.map(f => [f.id, f]));
    const natural = [...new Set(activeIds.map(id => parents.get(id)?.id ?? id))];
    const valid = new Set(natural);
    const saved = layout.order.filter(id => valid.has(id));
    const savedSet = new Set(saved);
    const order = [...natural.filter(id => !savedSet.has(id)), ...saved];
    const activity = new Map<string, string>();
    for (const id of activeIds) {
        const last = messages[id];
        if (!last || compareIds(last, layout.seen[id]) <= 0) continue;
        const key = parents.get(id)?.id ?? id;
        if (compareIds(last, activity.get(key)) > 0) activity.set(key, last);
    }
    order.sort((a, b) => {
        if (keepOnTop && byId.has(a) !== byId.has(b)) return byId.has(a) ? -1 : 1;
        return compareIds(activity.get(b), activity.get(a));
    });
    return order.flatMap(id => {
        const folder = byId.get(id);
        if (!folder) return [{ id }];
        return [{ id, folder }, ...(folder.expanded ? (folder.naturalOrder ? activeIds.filter(id => folder.channels.includes(id)) : folder.channels.filter(c => active.has(c))).map(id => ({ id, parent: folder })) : [])];
    });
}

/** Refresh visible order without discarding the slots of temporarily closed chats. */
export function mergeVisibleOrder(saved: string[], visible: string[]): string[] {
    const active = new Set(visible);
    const old = new Set(saved);
    const existing = visible.filter(id => old.has(id));
    let index = 0;
    return [...visible.filter(id => !old.has(id)), ...saved.map(id => active.has(id) ? existing[index++] : id)];
}

export function move(layout: Layout, rows: Row[], sourceId: string, targetId: string, placement: Placement, newId: string): Layout {
    const next: Layout = JSON.parse(JSON.stringify(layout));
    const source = rows.find(r => r.id === sourceId);
    const target = rows.find(r => r.id === targetId);
    if (!source || !target || sourceId === targetId) return next;
    if (source.folder && (placement === "inside" || target.parent)) return next;
    if (target.folder && target.folder.id === source.parent?.id && placement === "inside") return next;

    next.order = mergeVisibleOrder(layout.order, rows.filter(r => !r.parent).map(r => r.id));
    const folder = (id: string) => next.folders.find(f => f.id === id)!;
    const detach = () => {
        for (const f of next.folders) f.channels = f.channels.filter(id => id !== sourceId);
        next.order = next.order.filter(id => id !== sourceId);
    };
    const insert = (ids: string[], target: string, id: string, after: boolean) => {
        ids.splice(ids.indexOf(target) + (after ? 1 : 0), 0, id);
    };

    detach();
    if (placement === "inside") {
        const parent = target.folder ?? target.parent;
        if (parent) folder(parent.id).channels.push(sourceId);
        else {
            const created: Folder = { id: newId, name: "New Folder", color: DEFAULT_FOLDER_COLOR, channels: [targetId, sourceId], expanded: false };
            next.folders.push(created);
            next.order.splice(next.order.indexOf(targetId), 1, newId);
        }
    } else if (target.parent) {
        const parent = folder(target.parent.id);
        if (parent.naturalOrder) {
            const visible = rows.filter(r => r.parent?.id === parent.id && r.id !== sourceId).map(r => r.id);
            parent.channels = mergeVisibleOrder(parent.channels, visible);
            parent.naturalOrder = false;
        }
        insert(parent.channels, targetId, sourceId, placement === "after");
    } else {
        insert(next.order, targetId, sourceId, placement === "after");
    }
    next.folders = next.folders.filter(f => f.channels.length > 0);
    const removed = new Set(layout.folders.filter(f => !next.folders.some(n => n.id === f.id)).map(f => f.id));
    next.order = next.order.filter(id => !removed.has(id));
    return next;
}

export function withoutPinnedChannels(layout: Layout, pinned: Set<string>): Layout {
    if (!layout.folders.some(folder => folder.channels.some(id => pinned.has(id)))) return layout;

    const folders = layout.folders
        .map(folder => ({ ...folder, channels: folder.channels.filter(id => !pinned.has(id)) }))
        .filter(folder => folder.channels.length > 0);
    const removed = new Set(layout.folders.filter(folder => !folders.some(f => f.id === folder.id)).map(folder => folder.id));
    return { ...layout, folders, order: layout.order.filter(id => !pinned.has(id) && !removed.has(id)) };
}

export function resetLayoutOrder(layout: Layout): Layout {
    return { ...layout, order: [], seen: {}, folders: layout.folders.map(folder => ({ ...folder, naturalOrder: true })) };
}
