/* eslint-disable simple-header/header */

/*!
 * idb-keyval v6.2.0
 * Copyright 2016, Jake Archibald
 * Copyright 2022, Vendicated
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Logger } from "@utils/Logger";

const logger = new Logger("DataStore");
let loggedFailure = false;
const memoryDatabases = new Map<string, Map<string, Map<IDBValidKey, unknown>>>();

interface MemoryStore {
    __memoryStore: true;
    get<T>(key: IDBValidKey): T | undefined;
    put(value: unknown, key: IDBValidKey): void;
    delete(key: IDBValidKey): void;
    clear(): void;
    getAllKeys<KeyType extends IDBValidKey>(): KeyType[];
    getAll<T>(): T[];
    entries<KeyType extends IDBValidKey, ValueType>(): [KeyType, ValueType][];
}

type StoreLike = IDBObjectStore | MemoryStore;

function handleFailure(error: unknown) {
    if (loggedFailure) return;
    loggedFailure = true;
    logger.error("IndexedDB unavailable, using empty storage.", error);
}

function withFailureFallback<T>(promise: Promise<T>, fallback: T): Promise<T> {
    return promise.catch(error => {
        handleFailure(error);
        return fallback;
    });
}

function getMemoryStore(dbName: string, storeName: string): MemoryStore {
    let database = memoryDatabases.get(dbName);
    if (!database) {
        database = new Map();
        memoryDatabases.set(dbName, database);
    }

    let data = database.get(storeName);
    if (!data) {
        data = new Map<IDBValidKey, unknown>();
        database.set(storeName, data);
    }

    return {
        __memoryStore: true,
        get: <T>(key: IDBValidKey) => data.get(key) as T | undefined,
        put: (value, key) => { data.set(key, value); },
        delete: key => { data.delete(key); },
        clear: () => { data.clear(); },
        getAllKeys: <KeyType extends IDBValidKey>() => Array.from(data.keys()) as KeyType[],
        getAll: <T>() => Array.from(data.values()) as T[],
        entries: <KeyType extends IDBValidKey, ValueType>() => Array.from(data.entries()) as [KeyType, ValueType][]
    };
}

function isMemoryStore(store: StoreLike): store is MemoryStore {
    return "__memoryStore" in store;
}

export function promisifyRequest<T = undefined>(
    request: IDBRequest<T> | IDBTransaction,
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const target = request as IDBRequest<T> & IDBTransaction;
        target.oncomplete = target.onsuccess = () => resolve(target.result);
        target.onabort = target.onerror = () => reject(target.error);
    });
}

export function createStore(dbName: string, storeName: string): UseStore {
    const request = indexedDB.open(dbName);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    const dbp = promisifyRequest(request).catch(error => {
        handleFailure(error);
        return null;
    });
    const memoryStore = getMemoryStore(dbName, storeName);

    return async (txMode, callback) => {
        const db = await dbp;
        if (!db) return callback(memoryStore);

        return callback(db.transaction(storeName, txMode).objectStore(storeName));
    };
}

export type UseStore = <T>(
    txMode: IDBTransactionMode,
    callback: (store: StoreLike) => T | PromiseLike<T>,
) => Promise<T>;

let defaultGetStoreFunc: UseStore | undefined;

function defaultGetStore() {
    if (!defaultGetStoreFunc) {
        defaultGetStoreFunc = createStore(!IS_REPORTER ? "VencordData" : "VencordDataReporter", "VencordStore");
    }
    return defaultGetStoreFunc;
}

export function get<T = any>(
    key: IDBValidKey,
    customStore = defaultGetStore(),
): Promise<T | undefined> {
    return withFailureFallback(customStore("readonly", store => {
        if (isMemoryStore(store)) return store.get(key) as T | undefined;
        return promisifyRequest(store.get(key));
    }), undefined);
}

export function set(
    key: IDBValidKey,
    value: any,
    customStore = defaultGetStore(),
): Promise<void> {
    return withFailureFallback(customStore("readwrite", store => {
        store.put(value, key);
        if (isMemoryStore(store)) return;

        return promisifyRequest(store.transaction);
    }), undefined);
}

export function setMany(
    entries: [IDBValidKey, any][],
    customStore = defaultGetStore(),
): Promise<void> {
    return withFailureFallback(customStore("readwrite", store => {
        entries.forEach(entry => store.put(entry[1], entry[0]));
        if (isMemoryStore(store)) return;

        return promisifyRequest(store.transaction);
    }), undefined);
}

export function getMany<T = any>(
    keys: IDBValidKey[],
    customStore = defaultGetStore(),
): Promise<T[]> {
    return withFailureFallback(customStore("readonly", store => {
        if (isMemoryStore(store)) {
            return keys.map(key => store.get(key) as T | undefined);
        }

        return Promise.all(keys.map(key => promisifyRequest(store.get(key))));
    }), []);
}

export function update<T = any>(
    key: IDBValidKey,
    updater: (oldValue: T | undefined) => T,
    customStore = defaultGetStore(),
): Promise<void> {
    return withFailureFallback(customStore(
        "readwrite",
        store => {
            if (isMemoryStore(store)) {
                store.put(updater(store.get(key) as T | undefined), key);
                return;
            }

            return new Promise((resolve, reject) => {
                store.get(key).onsuccess = function () {
                    try {
                        store.put(updater(this.result), key);
                        resolve(promisifyRequest(store.transaction));
                    } catch (err) {
                        reject(err);
                    }
                };
            });
        },
    ), undefined);
}

export function del(
    key: IDBValidKey,
    customStore = defaultGetStore(),
): Promise<void> {
    return withFailureFallback(customStore("readwrite", store => {
        store.delete(key);
        if (isMemoryStore(store)) return;

        return promisifyRequest(store.transaction);
    }), undefined);
}

export function delMany(
    keys: IDBValidKey[],
    customStore = defaultGetStore(),
): Promise<void> {
    return withFailureFallback(customStore("readwrite", store => {
        keys.forEach(key => store.delete(key));
        if (isMemoryStore(store)) return;

        return promisifyRequest(store.transaction);
    }), undefined);
}

export function clear(customStore = defaultGetStore()): Promise<void> {
    return withFailureFallback(customStore("readwrite", store => {
        store.clear();
        if (isMemoryStore(store)) return;

        return promisifyRequest(store.transaction);
    }), undefined);
}

function eachCursor(
    store: IDBObjectStore,
    callback: (cursor: IDBCursorWithValue) => void,
): Promise<void> {
    store.openCursor().onsuccess = function () {
        if (!this.result) return;
        callback(this.result);
        this.result.continue();
    };
    return promisifyRequest(store.transaction);
}

export function keys<KeyType extends IDBValidKey>(
    customStore = defaultGetStore(),
): Promise<KeyType[]> {
    return withFailureFallback(customStore("readonly", store => {
        if (isMemoryStore(store)) return store.getAllKeys<KeyType>();

        if (store.getAllKeys) {
            return promisifyRequest(
                store.getAllKeys() as unknown as IDBRequest<KeyType[]>,
            );
        }

        const items: KeyType[] = [];
        return eachCursor(store, cursor =>
            items.push(cursor.key as KeyType),
        ).then(() => items);
    }), [] as KeyType[]);
}

export function values<T = any>(customStore = defaultGetStore()): Promise<T[]> {
    return withFailureFallback(customStore("readonly", store => {
        if (isMemoryStore(store)) return store.getAll<T>();

        if (store.getAll) {
            return promisifyRequest(store.getAll() as IDBRequest<T[]>);
        }

        const items: T[] = [];
        return eachCursor(store, cursor => items.push(cursor.value as T)).then(
            () => items,
        );
    }), [] as T[]);
}

export function entries<KeyType extends IDBValidKey, ValueType = any>(
    customStore = defaultGetStore(),
): Promise<[KeyType, ValueType][]> {
    return withFailureFallback(customStore("readonly", store => {
        if (isMemoryStore(store)) return store.entries<KeyType, ValueType>();

        if (store.getAll && store.getAllKeys) {
            return Promise.all([
                promisifyRequest(
                    store.getAllKeys() as unknown as IDBRequest<KeyType[]>,
                ),
                promisifyRequest(store.getAll() as IDBRequest<ValueType[]>),
            ]).then(([keys, values]) => keys.map((key, i) => [key, values[i]] as [KeyType, ValueType]));
        }

        const items: [KeyType, ValueType][] = [];
        return eachCursor(store, cursor =>
            items.push([cursor.key as KeyType, cursor.value]),
        ).then(() => items);
    }), [] as [KeyType, ValueType][]);
}
