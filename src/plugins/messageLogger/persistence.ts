/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { Message } from "@vencord/discord-types";

import { PersistedMessage, PlainMessage, SCHEMA_VERSION } from "./types";

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

// Stubs filled in by Task 3 / Task 4.
export function enqueueDelete(_message: Message): void { /* Task 3 */ }
export function enqueueEdit(_newMessage: Message, _oldMessage: Message): void { /* Task 3 */ }
export function flushSync(): void { /* Task 3 */ }

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
