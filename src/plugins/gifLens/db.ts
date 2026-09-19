/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { IndexedGifRecord } from "./types";

const DB_NAME = "GifLensDB";
const STORE_NAME = "gif_index";
const DB_VERSION = 1;

const memoryFallback = new Map<string, IndexedGifRecord>();
let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") {
            return reject(new Error("IndexedDB unavailable"));
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = event => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: "url" });
                store.createIndex("timestamp", "timestamp", { unique: false });
            }
        };

        request.onsuccess = event => {
            dbInstance = (event.target as IDBOpenDBRequest).result;
            resolve(dbInstance);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export function getMemoryCache(): Map<string, IndexedGifRecord> {
    return memoryFallback;
}

export function findCachedRecord(urlOrSrc: string): IndexedGifRecord | undefined {
    if (!urlOrSrc) return undefined;
    const direct = memoryFallback.get(urlOrSrc);
    if (direct) return direct;

    for (const rec of memoryFallback.values()) {
        if (rec.url === urlOrSrc || (rec.src && rec.src === urlOrSrc)) {
            return rec;
        }
    }

    for (const rec of memoryFallback.values()) {
        if (urlOrSrc.includes(rec.url) || rec.url.includes(urlOrSrc)) {
            return rec;
        }
        if (rec.src && (urlOrSrc.includes(rec.src) || rec.src.includes(urlOrSrc))) {
            return rec;
        }
    }

    return undefined;
}

export async function getGifRecord(url: string): Promise<IndexedGifRecord | null> {
    try {
        const db = await openDB();
        return await new Promise(resolve => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(url);

            request.onsuccess = () => {
                const res = request.result ?? null;
                if (res) memoryFallback.set(url, res);
                resolve(res ?? memoryFallback.get(url) ?? null);
            };
            request.onerror = () => resolve(memoryFallback.get(url) ?? null);
        });
    } catch {
        return memoryFallback.get(url) ?? null;
    }
}

export async function saveGifRecord(record: IndexedGifRecord): Promise<void> {
    memoryFallback.set(record.url, record);
    try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(record);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch {}
}

export async function getAllGifRecords(): Promise<Map<string, IndexedGifRecord>> {
    try {
        const db = await openDB();
        return await new Promise(resolve => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const list = (request.result as IndexedGifRecord[]) ?? [];
                for (const item of list) {
                    memoryFallback.set(item.url, item);
                }
                resolve(memoryFallback);
            };
            request.onerror = () => resolve(memoryFallback);
        });
    } catch {
        return memoryFallback;
    }
}

export async function getStoredRecordCount(): Promise<number> {
    try {
        const db = await openDB();
        return await new Promise(resolve => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(memoryFallback.size);
        });
    } catch {
        return memoryFallback.size;
    }
}

export async function clearAllRecords(): Promise<void> {
    memoryFallback.clear();
    try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch {}
}
