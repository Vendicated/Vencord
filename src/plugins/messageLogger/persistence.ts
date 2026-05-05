/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { Message } from "@vencord/discord-types";

import { PersistedMessage, PlainMessage, SCHEMA_VERSION, WriteEvent } from "./types";

const logger = new Logger("MessageLogger");
const DB_NAME = "VencordMessageLogger";
const DB_VERSION = 1;
const STORE_MESSAGES = "messages";
const STORE_META = "meta";

let dbPromise: Promise<IDBDatabase> | null = null;
let disabled = false;
let readOnly = false;

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
                const store = db.createObjectStore(STORE_MESSAGES, { keyPath: "id" });
                store.createIndex("channelId", "channelId", { unique: false });
                store.createIndex("guildId", "guildId", { unique: false });
                store.createIndex("capturedAt", "capturedAt", { unique: false });
                store.createIndex("deleted", "deleted", { unique: false });
            }
            if (!db.objectStoreNames.contains(STORE_META)) {
                db.createObjectStore(STORE_META);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => logger.warn("IDB open blocked — another tab has an older version open");
    });
}

/**
 * Open the DB and check schema version. Idempotent — safe to call multiple times.
 * On failure, sets `disabled = true` and the rest of the module no-ops.
 */
export async function init(): Promise<void> {
    if (dbPromise) return;
    try {
        dbPromise = openDb();
        const db = await dbPromise;
        const tx = db.transaction(STORE_META, "readwrite");
        const store = tx.objectStore(STORE_META);
        const verReq = store.get("version");
        await new Promise<void>((res, rej) => {
            verReq.onsuccess = () => {
                const stored = verReq.result as number | undefined;
                if (stored == null) {
                    store.put(SCHEMA_VERSION, "version");
                } else if (stored > SCHEMA_VERSION) {
                    readOnly = true;
                    logger.warn(`MessageLogger DB on disk is version ${stored} but code is ${SCHEMA_VERSION}; running read-only.`);
                }
                res();
            };
            verReq.onerror = () => rej(verReq.error);
        });
    } catch (e) {
        disabled = true;
        logger.error("Failed to open IndexedDB; persistence disabled.", e);
    }
}

export function isDisabled(): boolean {
    return disabled;
}

export function isReadOnly(): boolean {
    return readOnly;
}

// ---- serialize / deserialize -------------------------------------------------

/**
 * Convert a live Discord `Message` into a plain object suitable for IDB storage.
 * Strips class identity (structuredClone does this anyway) and converts Date
 * fields to ms-epoch numbers.
 */
export function serialize(message: Message): PlainMessage {
    const plain = { ...(message as any) } as any;
    plain.timestamp = (message as any).timestamp instanceof Date ? (message as any).timestamp.getTime() : (message as any).timestamp;
    plain.editedTimestamp = (message as any).editedTimestamp instanceof Date ? (message as any).editedTimestamp.getTime() : (message as any).editedTimestamp ?? null;
    if ((message as any).firstEditTimestamp instanceof Date) {
        plain.firstEditTimestamp = (message as any).firstEditTimestamp.getTime();
    }
    return plain as PlainMessage;
}

/**
 * Convert a stored plain message back to the shape Discord's Message constructor
 * expects (Date instances for timestamp fields).
 */
export function deserialize(plain: PlainMessage): any {
    const out: any = { ...plain };
    out.timestamp = new Date(plain.timestamp);
    out.editedTimestamp = plain.editedTimestamp == null ? null : new Date(plain.editedTimestamp);
    if (plain.firstEditTimestamp != null) {
        out.firstEditTimestamp = new Date(plain.firstEditTimestamp);
    }
    return out;
}

/**
 * Convert a stored editHistory entry back to the shape Vencord's existing UI expects:
 * `{ timestamp: Date, content: string }`.
 */
export function deserializeEditHistory(history?: PersistedMessage["editHistory"]): { timestamp: Date; content: string; }[] | undefined {
    if (!history) return undefined;
    return history.map(e => ({ timestamp: new Date(e.timestamp), content: e.content }));
}

// ---- write buffer -----------------------------------------------------------

const FLUSH_DEBOUNCE_MS = 500;
const FLUSH_FORCE_AT = 256;

let buffer: WriteEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(): void {
    if (flushTimer != null) return;
    flushTimer = setTimeout(() => { flushTimer = null; void flushBuffer(); }, FLUSH_DEBOUNCE_MS);
}

function maybeFlushNow(): void {
    if (buffer.length >= FLUSH_FORCE_AT) {
        if (flushTimer != null) { clearTimeout(flushTimer); flushTimer = null; }
        void flushBuffer();
    }
}

export function enqueueDelete(message: Message): void {
    if (disabled || readOnly) return;
    buffer.push({ kind: "delete", message, capturedAt: Date.now() });
    scheduleFlush();
    maybeFlushNow();
}

export function enqueueEdit(newMessage: Message, oldMessage: Message): void {
    if (disabled || readOnly) return;
    buffer.push({ kind: "edit", newMessage, oldMessage, capturedAt: Date.now() });
    scheduleFlush();
    maybeFlushNow();
}

/**
 * Best-effort sync flush for `beforeunload`. IDB transactions are async so this
 * fires-and-forgets — the browser may cut us off mid-transaction. Acceptable for
 * this data class.
 */
export function flushSync(): void {
    if (flushTimer != null) { clearTimeout(flushTimer); flushTimer = null; }
    if (buffer.length === 0) return;
    void flushBuffer();
}

/**
 * Coalesce buffered events by message ID (last-write-wins) and write in one tx.
 * For an "edit" event whose message ID already has a "delete" buffered: keep the
 * delete (a deleted message can't gain edit history).
 */
async function flushBuffer(): Promise<void> {
    if (disabled || readOnly) { buffer = []; return; }
    const batch = buffer;
    buffer = [];
    if (batch.length === 0) return;

    type Coalesced = { id: string; entry: PersistedMessage; isDelete: boolean; };
    const byId = new Map<string, Coalesced>();

    for (const ev of batch) {
        if (ev.kind === "delete") {
            const m = ev.message as any;
            byId.set(m.id, {
                id: m.id,
                isDelete: true,
                entry: {
                    id: m.id,
                    channelId: m.channel_id,
                    guildId: m.guild_id ?? undefined,
                    capturedAt: ev.capturedAt,
                    deleted: true,
                    message: serialize(ev.message),
                    editHistory: (m.editHistory ?? []).map((e: any) => ({
                        timestamp: e.timestamp instanceof Date ? e.timestamp.getTime() : e.timestamp,
                        content: e.content,
                    })),
                    firstEditTimestamp: m.firstEditTimestamp instanceof Date ? m.firstEditTimestamp.getTime() : m.firstEditTimestamp,
                },
            });
        } else {
            const newM = ev.newMessage as any;
            const oldM = ev.oldMessage as any;
            const existing = byId.get(newM.id);
            if (existing?.isDelete) continue;

            const priorHistory: { timestamp: number; content: string; }[] = existing?.entry.editHistory ?? (oldM.editHistory ?? []).map((e: any) => ({
                timestamp: e.timestamp instanceof Date ? e.timestamp.getTime() : e.timestamp,
                content: e.content,
            }));
            priorHistory.push({
                timestamp: newM.edited_timestamp ? new Date(newM.edited_timestamp).getTime() : Date.now(),
                content: oldM.content,
            });

            byId.set(newM.id, {
                id: newM.id,
                isDelete: false,
                entry: {
                    id: newM.id,
                    channelId: newM.channel_id,
                    guildId: newM.guild_id ?? undefined,
                    capturedAt: existing?.entry.capturedAt ?? ev.capturedAt,
                    deleted: false,
                    message: serialize(ev.newMessage),
                    editHistory: priorHistory,
                    firstEditTimestamp: oldM.firstEditTimestamp instanceof Date
                        ? oldM.firstEditTimestamp.getTime()
                        : (oldM.firstEditTimestamp ?? (oldM.timestamp instanceof Date ? oldM.timestamp.getTime() : oldM.timestamp)),
                },
            });
        }
    }

    try {
        const db = await dbPromise!;
        const tx = db.transaction(STORE_MESSAGES, "readwrite");
        const store = tx.objectStore(STORE_MESSAGES);
        for (const { entry } of byId.values()) {
            store.put(entry);
        }
        await new Promise<void>((res, rej) => {
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
            tx.onabort = () => rej(tx.error);
        });
    } catch (e) {
        logger.error("Failed to flush message-log write buffer", e);
    }
}

export async function getEntriesForChannel(_channelId: string, _opts?: { since?: number; }): Promise<PersistedMessage[]> { /* Task 4 */ return []; }
export async function removeEntry(_messageId: string): Promise<void> { /* Task 4 */ }
export async function purgeMatching(_predicate: (e: PersistedMessage) => boolean): Promise<number> { /* Task 4 */ return 0; }
export async function runRetentionPurge(_opts: { days: number; count: number; }): Promise<void> { /* Task 4 */ }

// Internal — exported only so subsequent tasks can wire in.
export const _internal = {
    db: () => dbPromise!,
    STORE_MESSAGES,
    STORE_META,
};
