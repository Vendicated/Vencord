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
    const dbp = promisifyRequest(request);

    return async (txMode, callback) => {
        try {
            const db = await dbp;
            return await callback(db.transaction(storeName, txMode).objectStore(storeName));
        } catch (error) {
            handleFailure(error);
            throw error;
        }
    };
}

export type UseStore = <T>(
    txMode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => T | PromiseLike<T>,
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
    return withFailureFallback(customStore("readonly", store => promisifyRequest(store.get(key))), undefined);
}

export function set(
    key: IDBValidKey,
    value: any,
    customStore = defaultGetStore(),
): Promise<void> {
    return withFailureFallback(customStore("readwrite", store => {
        store.put(value, key);
        return promisifyRequest(store.transaction);
    }), undefined);
}

export function setMany(
    entries: [IDBValidKey, any][],
    customStore = defaultGetStore(),
): Promise<void> {
    return withFailureFallback(customStore("readwrite", store => {
        entries.forEach(entry => store.put(entry[1], entry[0]));
        return promisifyRequest(store.transaction);
    }), undefined);
}

export function getMany<T = any>(
    keys: IDBValidKey[],
    customStore = defaultGetStore(),
): Promise<T[]> {
    return withFailureFallback(customStore("readonly", store =>
        Promise.all(keys.map(key => promisifyRequest(store.get(key)))),
    ), []);
}

export function update<T = any>(
    key: IDBValidKey,
    updater: (oldValue: T | undefined) => T,
    customStore = defaultGetStore(),
): Promise<void> {
    return withFailureFallback(customStore(
        "readwrite",
        store =>
            new Promise((resolve, reject) => {
                store.get(key).onsuccess = function () {
                    try {
                        store.put(updater(this.result), key);
                        resolve(promisifyRequest(store.transaction));
                    } catch (err) {
                        reject(err);
                    }
                };
            }),
    ), undefined as void);
}

export function del(
    key: IDBValidKey,
    customStore = defaultGetStore(),
): Promise<void> {
    return withFailureFallback(customStore("readwrite", store => {
        store.delete(key);
        return promisifyRequest(store.transaction);
    }), undefined as void);
}

export function delMany(
    keys: IDBValidKey[],
    customStore = defaultGetStore(),
): Promise<void> {
    return withFailureFallback(customStore("readwrite", store => {
        keys.forEach(key => store.delete(key));
        return promisifyRequest(store.transaction);
    }), undefined as void);
}

export function clear(customStore = defaultGetStore()): Promise<void> {
    return withFailureFallback(customStore("readwrite", store => {
        store.clear();
        return promisifyRequest(store.transaction);
    }), undefined as void);
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
        if (store.getAllKeys) {
            return promisifyRequest(store.getAllKeys() as unknown as IDBRequest<KeyType[]>);
        }

        const items: KeyType[] = [];
        return eachCursor(store, cursor => items.push(cursor.key as KeyType)).then(() => items);
    }), [] as KeyType[]);
}

export function values<T = any>(customStore = defaultGetStore()): Promise<T[]> {
    return withFailureFallback(customStore("readonly", store => {
        if (store.getAll) {
            return promisifyRequest(store.getAll() as IDBRequest<T[]>);
        }

        const items: T[] = [];
        return eachCursor(store, cursor => items.push(cursor.value as T)).then(() => items);
    }), [] as T[]);
}

export function entries<KeyType extends IDBValidKey, ValueType = any>(
    customStore = defaultGetStore(),
): Promise<[KeyType, ValueType][]> {
    return withFailureFallback(customStore("readonly", store => {
        if (store.getAll && store.getAllKeys) {
            return Promise.all([
                promisifyRequest(store.getAllKeys() as unknown as IDBRequest<KeyType[]>),
                promisifyRequest(store.getAll() as IDBRequest<ValueType[]>),
            ]).then(([keys, values]) => keys.map((key, i) => [key, values[i]] as [KeyType, ValueType]));
        }

        const items: [KeyType, ValueType][] = [];
        return eachCursor(store, cursor => items.push([cursor.key as KeyType, cursor.value])).then(() => items);
    }), [] as [KeyType, ValueType][]);
}
