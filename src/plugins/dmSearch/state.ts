/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Bag, TabKey } from "./types";

const TTL_MS = 30 * 60 * 1000;

interface Snapshot {
    query: string;
    tab: TabKey;
    bag: Bag;
    scrolls: Partial<Record<TabKey, number>>;
    ts: number;
}

let snap: Snapshot | null = null;

export function save_session(query: string, tab: TabKey, bag: Bag): void {
    snap = {
        query,
        tab,
        bag,
        scrolls: snap?.scrolls ?? {},
        ts: Date.now()
    };
}

export function save_scroll(tab: TabKey, top: number): void {
    if (!snap) return;
    snap.scrolls[tab] = top;
    snap.ts = Date.now();
}

export function get_scroll(tab: TabKey): number {
    return snap?.scrolls?.[tab] ?? 0;
}

export function load_session(): Snapshot | null {
    if (!snap) return null;
    if (Date.now() - snap.ts > TTL_MS) {
        snap = null;
        return null;
    }
    return snap;
}
