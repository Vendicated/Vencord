/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createStore as createIdbStore, del, get, set, type UseStore } from "@api/DataStore";
import { Native } from "@plugins/soundPanel.desktop/utils/native";

import { applyIndexChange, type IndexChange, type LibraryItem } from "./libraryIndex";

interface LibraryStorage {
    readIndex(): Promise<LibraryItem[]>;
    changeIndex(change: IndexChange): Promise<LibraryItem[]>;
    writeFile(id: string, file: Blob): Promise<void>;
    readFile(id: string, mimeType: string): Promise<Blob | null>;
    deleteFile(id: string): Promise<void>;
}

const INDEX_KEY = "index";
const MIGRATED_KEY = "migratedToDisk";
const fileKey = (id: string) => `file:${id}`;

let idbStore: UseStore | undefined;
const db = () => idbStore ??= createIdbStore("SoundPanelData", "SoundPanelStore");

const idbStorage: LibraryStorage = {
    async readIndex() {
        return await get<LibraryItem[]>(INDEX_KEY, db()) ?? [];
    },
    async changeIndex(change) {
        const items = applyIndexChange(await idbStorage.readIndex(), change);
        await set(INDEX_KEY, items, db());
        return items;
    },
    writeFile: (id, file) => set(fileKey(id), file, db()),
    async readFile(id) {
        return await get<Blob>(fileKey(id), db()) ?? null;
    },
    deleteFile: id => del(fileKey(id), db())
};

function createDiskStorage(native: NonNullable<typeof Native>): LibraryStorage {
    return {
        readIndex: () => native.readLibraryIndex(),
        changeIndex: change => native.changeLibraryIndex(change),
        async writeFile(id, file) {
            await native.writeLibraryFile(id, new Uint8Array(await file.arrayBuffer()));
        },
        async readFile(id, mimeType) {
            const data = await native.readLibraryFile(id);
            return data && new Blob([data], { type: mimeType });
        },
        deleteFile: id => native.deleteLibraryFile(id)
    };
}

export const storage = Native ? createDiskStorage(Native) : idbStorage;

export async function migrateLegacyLibrary(current: LibraryItem[]) {
    if (storage === idbStorage || await get<boolean>(MIGRATED_KEY, db())) return current;

    const known = new Set(current.map(item => item.id));
    const moved: LibraryItem[] = [];

    for (const item of await idbStorage.readIndex()) {
        if (known.has(item.id)) continue;

        const file = await idbStorage.readFile(item.id, item.mimeType);
        if (!file) continue;

        await storage.writeFile(item.id, file);
        moved.push(item);
    }

    const items = moved.length ? await storage.changeIndex({ type: "add", items: moved }) : current;
    await set(MIGRATED_KEY, true, db());
    return items;
}
