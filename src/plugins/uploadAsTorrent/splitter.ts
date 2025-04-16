/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const CHUNK_SIZE = 9 * 1024 * 1024;
const DB_NAME = "VencordTorrentChunks";
const DB_VERSION = 1;
const CACHE_CLEANUP_INTERVAL = 30 * 60 * 1000;
const CHUNK_TTL = 2 * 60 * 60 * 1000;

let db: IDBDatabase | null = null;
const dbReady = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new Error("Failed to open database"));
    request.onsuccess = () => resolve(db = request.result);
    request.onupgradeneeded = e => {
        const store = (e.target as IDBOpenDBRequest).result.createObjectStore("chunks", { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
    };
}).catch(() => null as never);

const txnPromise = <T>(store: IDBObjectStore, req: IDBRequest<T>) =>
    new Promise<T>((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = store.transaction.onerror = () => reject(new Error("Database transaction failed"));
    });

async function cleanupOldChunks() {
    const db = await dbReady;
    if (!db) return;

    const store = db.transaction("chunks", "readwrite").objectStore("chunks");
    const cutoff = Date.now() - CHUNK_TTL;

    try {
        const request = store.index("timestamp").openCursor(IDBKeyRange.upperBound(cutoff));
        while (request) {
            const cursor = await new Promise<IDBCursorWithValue | null>(
                resolve => { request.onsuccess = () => resolve(request.result); }
            );
            if (!cursor) break;
            cursor.delete();
            cursor.continue();
        }
    } catch { }
}

if (typeof window !== "undefined") {
    const interval = setInterval(cleanupOldChunks, CACHE_CLEANUP_INTERVAL);
    window.addEventListener("unload", () => clearInterval(interval), { once: true });
}

export async function* splitFile(file: File, sessionId: string) {
    const db = await dbReady;
    if (!db) throw new Error("Database not available");

    console.log(`[Splitter] Splitting file into chunks: ${file.size} bytes`);
    const chunks = Math.ceil(file.size / CHUNK_SIZE);
    console.log(`[Splitter] Total chunks: ${chunks}`);

    for (let i = 0; i < chunks; i++) {
        const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const timestamp = Date.now();
        const chunkId = `${timestamp}-${sessionId}-${i}`;

        const store = db.transaction("chunks", "readwrite").objectStore("chunks");
        try {
            await txnPromise(store, store.put({ id: chunkId, data: chunk, timestamp }));
            console.log(`[Splitter] Stored chunk ${i + 1}/${chunks}`);
            yield { id: chunkId, index: i };
        } catch (err) {
            console.error(`[Splitter] Failed to store chunk ${i}:`, err);
            await deleteChunks(sessionId);
            throw new Error("Failed to store file chunk");
        }
    }
}

export async function getChunk(chunkId: string) {
    const db = await dbReady;
    if (!db) return null;

    const store = db.transaction("chunks", "readonly").objectStore("chunks");
    const result = await txnPromise(store, store.get(chunkId));
    console.log(`[Splitter] Retrieved chunk: ${chunkId}, exists: ${!!result?.data}`);
    return result?.data ?? null;
}

export async function deleteChunks(sessionId: string) {
    const db = await dbReady;
    if (!db) return;

    const store = db.transaction("chunks", "readwrite").objectStore("chunks");
    const range = IDBKeyRange.bound(`${Date.now()}-${sessionId}`, `${Date.now()}-${sessionId}\uffff`);
    await txnPromise(store, store.delete(range));
}
