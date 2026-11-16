/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type LibraryKind = "sound" | "music";

export interface LibraryItem {
    id: string;
    name: string;
    kind: LibraryKind;
    mimeType: string;
    size: number;
    duration: number;
    volume: number;
    addedAt: number;
    artist?: string;
    youtubeId?: string;
    cover?: boolean;
    favorite?: boolean;
}

export type LibraryPatch = Partial<Pick<LibraryItem, "name" | "volume" | "kind" | "favorite">>;

export type IndexChange =
    | { type: "add"; items: LibraryItem[]; }
    | { type: "update"; id: string; patch: LibraryPatch; }
    | { type: "remove"; id: string; };

export function applyIndexChange(items: LibraryItem[], change: IndexChange): LibraryItem[] {
    switch (change.type) {
        case "add": {
            const added = new Set(change.items.map(item => item.id));
            return [...items.filter(item => !added.has(item.id)), ...change.items];
        }
        case "update":
            return items.map(item => item.id === change.id ? { ...item, ...change.patch } : item);
        case "remove":
            return items.filter(item => item.id !== change.id);
    }
}
