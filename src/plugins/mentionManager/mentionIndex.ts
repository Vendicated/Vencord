/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { MentionType } from "./classifier";

export interface MentionEntry {
    messageId: string;
    channelId: string;
    guildId: string | null;
    authorId: string;
    mentionType: MentionType;
    /** snowflake-extractable timestamp (ms) */
    timestamp: number;
    addedAt: number;
    threadParentId?: string;
}

/**
 * In-memory mention index. All lookups are O(1) or O(k); message history
 * is never scanned. Ordering relies on Discord snowflakes being
 * lexicographically sortable, so no timestamp parsing is needed.
 */
export class MentionIndex {
    private byId = new Map<string, MentionEntry>();
    /** channelId -> messageIds, ascending (oldest first) */
    private byChannel = new Map<string, string[]>();
    /** global order, ascending (oldest first) */
    private global: string[] = [];

    get size(): number {
        return this.byId.size;
    }

    has(messageId: string): boolean {
        return this.byId.has(messageId);
    }

    get(messageId: string): MentionEntry | undefined {
        return this.byId.get(messageId);
    }

    add(entry: MentionEntry): boolean {
        if (this.byId.has(entry.messageId)) return false;
        this.byId.set(entry.messageId, entry);
        insertSorted(this.byChannel, entry.channelId, entry.messageId);
        insertSortedGlobal(this.global, entry.messageId);
        return true;
    }

    remove(messageId: string): boolean {
        const entry = this.byId.get(messageId);
        if (!entry) return false;
        this.byId.delete(messageId);

        const list = this.byChannel.get(entry.channelId);
        if (list) {
            const i = list.indexOf(messageId);
            if (i !== -1) list.splice(i, 1);
            if (list.length === 0) this.byChannel.delete(entry.channelId);
        }
        const gi = this.global.indexOf(messageId);
        if (gi !== -1) this.global.splice(gi, 1);
        return true;
    }

    /** Newest entry globally, or null. */
    last(): MentionEntry | null {
        for (let i = this.global.length - 1; i >= 0; i--) {
            const e = this.byId.get(this.global[i]);
            if (e) return e;
        }
        return null;
    }

    /** Oldest entry globally, or null (used for circular forward wrap). */
    first(): MentionEntry | null {
        for (const id of this.global) {
            const e = this.byId.get(id);
            if (e) return e;
        }
        return null;
    }

    /** Newest entry in a channel, or null. */
    lastInChannel(channelId: string): MentionEntry | null {
        const list = this.byChannel.get(channelId);
        if (!list) return null;
        for (let i = list.length - 1; i >= 0; i--) {
            const e = this.byId.get(list[i]);
            if (e) return e;
        }
        return null;
    }

    /**
     * Entry immediately older than `beforeMessageId` in scope.
     * Powers "activate again → previous mention".
     */
    previous(beforeMessageId: string, channelId?: string): MentionEntry | null {
        const order = channelId ? this.byChannel.get(channelId) ?? [] : this.global;
        let idx = order.length;
        for (let i = 0; i < order.length; i++) {
            if (order[i] >= beforeMessageId) {
                idx = i;
                break;
            }
        }
        for (let i = idx - 1; i >= 0; i--) {
            const e = this.byId.get(order[i]);
            if (e) return e;
        }
        return null;
    }

    /** Entry immediately newer than `afterMessageId` in scope. */
    next(afterMessageId: string, channelId?: string): MentionEntry | null {
        const order = channelId ? this.byChannel.get(channelId) ?? [] : this.global;
        for (const id of order) {
            if (id <= afterMessageId) continue;
            const e = this.byId.get(id);
            if (e) return e;
        }
        return null;
    }

    /** 1-based position of an entry in scope plus scope size, for "2/5" UI. */
    positionOf(messageId: string, channelId?: string): { position: number; total: number; } | null {
        const order = (channelId ? this.byChannel.get(channelId) : this.global) ?? [];
        const live = order.filter(id => this.byId.has(id));
        const i = live.indexOf(messageId);
        if (i === -1) return null;
        return { position: i + 1, total: live.length };
    }

    clear(): void {
        this.byId.clear();
        this.byChannel.clear();
        this.global = [];
    }

    /** Drop entries older than `maxAgeMs`, then oldest-first beyond `maxEntries`. */
    prune(maxEntries: number, maxAgeMs: number, now = Date.now()): number {
        let removed = 0;
        if (maxAgeMs > 0) {
            const cutoff = now - maxAgeMs;
            for (const [id, e] of [...this.byId]) {
                if (e.timestamp < cutoff) {
                    this.remove(id);
                    removed++;
                }
            }
        }
        if (maxEntries > 0) {
            while (this.global.length > maxEntries) {
                const oldest = this.global[0];
                this.global.shift();
                if (this.byId.has(oldest)) {
                    this.remove(oldest);
                    removed++;
                }
            }
        }
        return removed;
    }

    toJSON(): MentionEntry[] {
        const out: MentionEntry[] = [];
        for (const id of this.global) {
            const e = this.byId.get(id);
            if (e) out.push(e);
        }
        return out;
    }

    load(entries: MentionEntry[]): { added: number; skipped: number; } {
        let added = 0, skipped = 0;
        for (const e of entries) {
            if (!e?.messageId || !e?.channelId) {
                skipped++;
                continue;
            }
            this.add(e) ? added++ : skipped++;
        }
        return { added, skipped };
    }
}

function insertSorted(map: Map<string, string[]>, key: string, id: string) {
    const list = map.get(key);
    if (!list) {
        map.set(key, [id]);
        return;
    }
    if (list.length === 0 || id > list[list.length - 1]) {
        list.push(id);
    } else {
        list.push(id);
        list.sort();
    }
}

function insertSortedGlobal(global: string[], id: string) {
    if (global.length === 0 || id > global[global.length - 1]) {
        global.push(id);
    } else {
        global.push(id);
        global.sort();
    }
}
