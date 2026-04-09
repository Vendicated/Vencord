/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { ChannelStore, Toasts } from "@webpack/common";
import { DBSchema, IDBPDatabase, openDB } from "idb";

import { LoggedMessageJSON } from "./types";
import { getMessageStatus } from "./utils";
import { stripTransientRenderState } from "./utils/cleanUp";
import { DB_NAME, DB_VERSION } from "./utils/constants";
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

const logger = new Logger("MessageLoggerEnhanced");
let db: IDBPDatabase<MLIDB> | null = null;
let dbPromise: Promise<IDBPDatabase<MLIDB> | null> | null = null;
let loggedFailure = false;

export const cachedMessages = new Map<string, LoggedMessageJSON>();

function handleDbFailure(error: unknown) {
    if (loggedFailure) return;
    loggedFailure = true;
    logger.error("Message storage unavailable, using memory only.", error);
}

async function ensureDb() {
    if (db) return db;
    if (!dbPromise) {
        dbPromise = openDB<MLIDB>(DB_NAME, DB_VERSION, {
            upgrade(database) {
                const messageStore = database.createObjectStore("messages", { keyPath: "message_id" });
                messageStore.createIndex("by_channel_id", "channel_id");
                messageStore.createIndex("by_status", "status");
                messageStore.createIndex("by_timestamp", "message.timestamp");
                messageStore.createIndex("by_timestamp_and_message_id", ["channel_id", "message.timestamp"]);
            }
        }).then(database => {
            db = database;
            return database;
        }).catch(error => {
            handleDbFailure(error);
            return null;
        });
    }

    db = await dbPromise;
    return db;
}

async function withDb<T>(fallback: T, callback: (database: IDBPDatabase<MLIDB>) => Promise<T>): Promise<T> {
    const database = await ensureDb();
    if (!database) return fallback;

    try {
        return await callback(database);
    } catch (error) {
        handleDbFailure(error);
        return fallback;
    }
}

async function cacheRecords(records: DBMessageRecord[], cacheAttachmentBlobs = true) {
    for (const r of records) {
        cacheRecord(r);

        if (!cacheAttachmentBlobs) continue;

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

    stripTransientRenderState(record.message);
    cachedMessages.set(record.message_id, record.message);
    return record;
}

export async function initIDB() {
    await ensureDb();
}
void initIDB();

export async function hasMessageIDB(message_id: string) {
    if (cachedMessages.has(message_id)) return true;
    return withDb(false, database => database.count("messages", message_id).then(count => count > 0));
}

export async function countMessagesIDB() {
    if (!db) return cachedMessages.size;
    return db.count("messages");
}

export async function countMessagesByStatusIDB(status: DBMessageStatus) {
    return withDb(0, database => database.countFromIndex("messages", "by_status", status));
}

export async function getAllMessagesIDB() {
    return withDb([], async database => cacheRecords(await database.getAll("messages")));
}

export async function getMessagesForChannelIDB(channel_id: string) {
    return withDb([], async database => cacheRecords(await database.getAllFromIndex("messages", "by_channel_id", channel_id)));
}

export async function getMessageIDB(message_id: string) {
    return withDb<DBMessageRecord | null>(null, async database => {
        const record = await database.get("messages", message_id);
        await cacheRecord(record);
        return record ?? null;
    });
}

export async function getMessagesByStatusIDB(status: DBMessageStatus) {
    return withDb([], async database => cacheRecords(await database.getAllFromIndex("messages", "by_status", status)));
}

export async function getOldestMessagesIDB(limit: number) {
    return withDb([], async database => cacheRecords(await database.getAllFromIndex("messages", "by_timestamp", undefined, limit)));
}

export async function* iterateAllMessagesIDB(batchSize = 100) {
    if (!db && !(await ensureDb())) return;

    let lastId: string | undefined;
    while (true) {
        const batch: DBMessageRecord[] = [];

        const tx = db!.transaction("messages");
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

export async function getOlderThanTimestampIDB(timestamp: string) {
    return withDb([], async database => {
        const tx = database.transaction("messages", "readonly");
        const index = tx.store.index("by_timestamp");
        const cursor = await index.openCursor(IDBKeyRange.upperBound(timestamp));

        if (!cursor) return [];

        const messages: DBMessageRecord[] = [];
        for await (const c of cursor) {
            messages.push(c.value);
        }

        return cacheRecords(messages, false);
    });
}

export async function getOlderThanTimestampForGuildsIDB(timestamp: string, currentChannelId?: string, preserveCurrentChannel?: boolean) {
    const allOldMessages = await getOlderThanTimestampIDB(timestamp);
    return allOldMessages.filter(record => {
        const { message } = record;
        const channel = ChannelStore.getChannel(message.channel_id);
        const isGuildMessage = channel?.guild_id != null;
        const isCurrentChannel = preserveCurrentChannel && currentChannelId && message.channel_id === currentChannelId;
        return isGuildMessage && !isCurrentChannel;
    });
}

export async function getDateStortedMessagesByStatusIDB(newest: boolean, limit: number, status: DBMessageStatus) {
    return withDb([], async database => {
        const tx = database.transaction("messages", "readonly");
        const index = tx.store.index("by_status");
        const direction = newest ? "prev" : "next";
        const cursor = await index.openCursor(IDBKeyRange.only(status), direction);

        if (!cursor) {
            return [];
        }

        const messages: DBMessageRecord[] = [];
        for await (const c of cursor) {
            messages.push(c.value);
            if (messages.length >= limit) break;
        }

        return cacheRecords(messages);
    });
}

export async function getMessagesByChannelAndAfterTimestampIDB(channel_id: string, start: string) {
    return withDb([], async database => {
        const tx = database.transaction("messages", "readonly");
        const index = tx.store.index("by_timestamp_and_message_id");
        const cursor = await index.openCursor(IDBKeyRange.bound([channel_id, start], [channel_id, "\uffff"]));

        if (!cursor) {
            return [];
        }

        const messages: DBMessageRecord[] = [];
        for await (const c of cursor) {
            messages.push(c.value);
        }

        return cacheRecords(messages, false);
    });
}

export async function addMessageIDB(message: LoggedMessageJSON, status: DBMessageStatus) {
    stripTransientRenderState(message);
    cachedMessages.set(message.id, message);

    return withDb(void 0, async database => {
        await database.put("messages", {
            channel_id: message.channel_id,
            message_id: message.id,
            status,
            message,
        });
    });
}

export async function addMessagesBulkIDB(messages: LoggedMessageJSON[], status?: DBMessageStatus) {
    messages.forEach(stripTransientRenderState);
    messages.forEach(message => cachedMessages.set(message.id, message));

    return withDb(void 0, async database => {
        const tx = database.transaction("messages", "readwrite");
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
    });
}

export async function deleteMessageIDB(message_id: string) {
    cachedMessages.delete(message_id);

    return withDb(void 0, database => database.delete("messages", message_id));
}

export async function deleteMessagesBulkIDB(message_ids: string[]) {
    message_ids.forEach(id => cachedMessages.delete(id));

    return withDb(void 0, async database => {
        const tx = database.transaction("messages", "readwrite");
        const { store } = tx;
        await Promise.all([
            ...message_ids.map(id => store.delete(id)),
            tx.done
        ]);
    });
}

export async function clearMessagesIDB() {
    cachedMessages.clear();

    return withDb(void 0, database => database.clear("messages")).then(() => {
        Toasts.show({
            type: Toasts.Type.MESSAGE,
            message: "Cleared message log database and cache.",
            id: Toasts.genId()
        });
    });
}
