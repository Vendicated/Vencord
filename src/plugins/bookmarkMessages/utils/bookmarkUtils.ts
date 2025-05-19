/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { UserStore } from "@webpack/common";

const DB_NAME = "MessageBookmarks";
const DB_VERSION = 1;
const STORE_NAME = "bookmarks";

export interface Bookmark {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    channelId: string;
    guildId?: string;
    timestamp: number;
}

let db: IDBDatabase;

function openBookmarkDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onerror = () => reject(request.error);
    });
}

export async function toggleBookmark(msg: Bookmark): Promise<void> {
    const db = await openBookmarkDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const getReq = store.get(msg.id);
    getReq.onsuccess = () => {
        if (getReq.result) {
            store.delete(msg.id);
        } else {
            const user = UserStore.getUser(msg.authorId);
            const avatar = user?.getAvatarURL?.() ?? `https://cdn.discordapp.com/embed/avatars/0.png`;
            msg.authorAvatar = avatar;

            store.put(msg);
        }
    };

    await tx.done;
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
    const db = await openBookmarkDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => {
            resolve(req.result as Bookmark[]);
        };
        req.onerror = () => {
            resolve([]);
        };
    });
}

export async function isBookmarked(id: string): Promise<boolean> {
    const db = await openBookmarkDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise(resolve => {
        const req = store.get(id);
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => resolve(false);
    });
}

export async function removeBookmark(id: string): Promise<void> {
    const db = await openBookmarkDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    await tx.done;
}

export async function clearAllBookmarks(): Promise<void> {
    const db = await openBookmarkDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    await tx.done;
}
