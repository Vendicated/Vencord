/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LoggedMessageJSON } from "./types";
import { getMessageStatus } from "./utils";
import { DB_NAME, DB_VERSION } from "./utils/constants";
import { DBSchema, IDBPDatabase, openDB } from "./utils/idb";
import { getAttachmentBlobUrl } from "./utils/saveImage";

export enum DBMessageStatus {
    DELETED = "DELETED",
    EDITED = "EDITED",
    GHOST_PINGED = "GHOST_PINGED",
}

export interface DBMessageRecord {
    message_id: string;
    channel_id: string;
    status: DBMessageStatus;
    message: LoggedMessageJSON;
}

export interface MLIDB extends DBSchema {
    messages: {
        key: string;
        value: DBMessageRecord;
        indexes: {
            by_channel_id: string;
            by_status: DBMessageStatus;
            by_timestamp: string;
            by_timestamp_and_message_id: [string, string];
        };
    };

}

export let db: IDBPDatabase<MLIDB>;
export const cachedMessages = new Map<string, LoggedMessageJSON>();

// this is probably not the best way to do this
async function cacheRecords(records: DBMessageRecord[]) {
    for (const r of records) {
        cacheRecord(r);

        for (const att of r.message.attachments) {
            const blobUrl = await getAttachmentBlobUrl(att);
            if (blobUrl) {
                att.url = blobUrl + "#";
                att.proxy_url = blobUrl + "#";
            }
        }
    }
    return records;
}

async function cacheRecord(record?: DBMessageRecord | null) {
    if (!record) return record;

    cachedMessages.set(record.message_id, record.message);
    return record;
}

export async function initIDB() {
    db = await openDB<MLIDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            const messageStore = db.createObjectStore("messages", { keyPath: "message_id" });
            messageStore.createIndex("by_channel_id", "channel_id");
            messageStore.createIndex("by_status", "status");
            messageStore.createIndex("by_timestamp", "message.timestamp");
            messageStore.createIndex("by_timestamp_and_message_id", ["channel_id", "message.timestamp"]);
        }
    });
}
initIDB();

export async function hasMessageIDB(message_id: string) {
    return cachedMessages.has(message_id) || (await db.count("messages", message_id)) > 0;
}

export async function countMessagesIDB() {
    return db.count("messages");
}

export async function countMessagesByStatusIDB(status: DBMessageStatus) {
    return db.countFromIndex("messages", "by_status", status);
}

export async function getAllMessagesIDB() {
    return cacheRecords(await db.getAll("messages"));
}

export async function getMessagesForChannelIDB(channel_id: string) {
    return cacheRecords(await db.getAllFromIndex("messages", "by_channel_id", channel_id));
}

export async function getMessageIDB(message_id: string) {
    return cacheRecord(await db.get("messages", message_id));
}

export async function getMessagesByStatusIDB(status: DBMessageStatus) {
    return cacheRecords(await db.getAllFromIndex("messages", "by_status", status));
}

export async function getOldestMessagesIDB(limit: number) {
    return cacheRecords(await db.getAllFromIndex("messages", "by_timestamp", undefined, limit));
}

export async function* iterateAllMessagesIDB(batchSize = 100) {
    let lastId: string | undefined;
    while (true) {
        const batch: DBMessageRecord[] = [];
        // new transaction for each batch to avoid timeouts during yield
        const tx = db.transaction("messages");
        const range = lastId ? IDBKeyRange.lowerBound(lastId, true) : undefined;
        let cursor = await tx.store.openCursor(range);

        while (cursor && batch.length < batchSize) {
            batch.push(cursor.value);
            cursor = await cursor.continue();
        }

        if (batch.length === 0) break;

        lastId = batch[batch.length - 1].message_id;

        yield await cacheRecords(batch);

        if (batch.length < batchSize) break;
    }
}

export async function getDateStortedMessagesByStatusIDB(newest: boolean, limit: number, status: DBMessageStatus) {
    const tx = db.transaction("messages", "readonly");
    const { store } = tx;
    const index = store.index("by_status");

    const direction = newest ? "prev" : "next";
    const cursor = await index.openCursor(IDBKeyRange.only(status), direction);

    if (!cursor) {
        console.log("No messages found");
        return [];
    }

    const messages: DBMessageRecord[] = [];
    for await (const c of cursor) {
        messages.push(c.value);
        if (messages.length >= limit) break;
    }

    return cacheRecords(messages);
}

export async function getMessagesByChannelAndAfterTimestampIDB(channel_id: string, start: string) {
    const tx = db.transaction("messages", "readonly");
    const { store } = tx;
    const index = store.index("by_timestamp_and_message_id");

    const cursor = await index.openCursor(IDBKeyRange.bound([channel_id, start], [channel_id, "\uffff"]));

    if (!cursor) {
        console.log("No messages found in range");
        return [];
    }

    const messages: DBMessageRecord[] = [];
    for await (const c of cursor) {
        messages.push(c.value);
    }

    return cacheRecords(messages);
}

export async function addMessageIDB(message: LoggedMessageJSON, status: DBMessageStatus) {
    await db.put("messages", {
        channel_id: message.channel_id,
        message_id: message.id,
        status,
        message,
    });

    cachedMessages.set(message.id, message);
}

export async function addMessagesBulkIDB(messages: LoggedMessageJSON[], status?: DBMessageStatus) {
    const tx = db.transaction("messages", "readwrite");
    const { store } = tx;

    await Promise.all([
        ...messages.map(message => store.add({
            channel_id: message.channel_id,
            message_id: message.id,
            status: status ?? getMessageStatus(message),
            message,
        })),
        tx.done
    ]);

    messages.forEach(message => cachedMessages.set(message.id, message));
}


export async function deleteMessageIDB(message_id: string) {
    await db.delete("messages", message_id);

    cachedMessages.delete(message_id);
}

export async function deleteMessagesBulkIDB(message_ids: string[]) {
    const tx = db.transaction("messages", "readwrite");
    const { store } = tx;

    await Promise.all([...message_ids.map(id => store.delete(id)), tx.done]);
    message_ids.forEach(id => cachedMessages.delete(id));
}

export async function clearMessagesIDB() {
    await db.clear("messages");
    cachedMessages.clear();
}
