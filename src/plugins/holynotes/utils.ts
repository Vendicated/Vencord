/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import { noteHandlerCache } from "./noteHandler";
import { HolyNotes } from "./types";



export async function saveCacheToDataStore(key: string, value?: HolyNotes.Note[]) {
    await DataStore.set(key, value);

}

export async function getFormatedEntries() {
    const data = await DataStore.entries();
    const notebooks: Record<string, HolyNotes.Note> = {};

    data.forEach(function (note) {
        notebooks[note[0]] = note[1];
    });

    return notebooks;
}

export async function DataStoreToCache() {
    const data = await DataStore.entries();

    data.forEach(function (note) {
        noteHandlerCache.set(note[0], note[1]);
    });
}
