/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createStore } from "@api/DataStore";
import { DataStore } from "@api/index";

import { noteHandlerCache } from "./noteHandler";
import { HolyNotes } from "./types";

export const HolyNoteStore = createStore("HolyNoteData", "HolyNoteStore");

export async function saveCacheToDataStore(key: string, value?: HolyNotes.Note[]) {
    await DataStore.set(key, value, HolyNoteStore);
}

export async function deleteCacheFromDataStore(key: string) {
    await DataStore.del(key, HolyNoteStore);
}

export async function getFormatedEntries() {
    const data = await DataStore.entries(HolyNoteStore);
    const notebooks: Record<string, HolyNotes.Note> = {};

    data.forEach(function (note) {
        notebooks[note[0]] = note[1];
    });

    return notebooks;
}

export async function DataStoreToCache() {
    const data = await DataStore.entries(HolyNoteStore);

    data.forEach(function (note) {
        noteHandlerCache.set(note[0], note[1]);
    });
}

export async function DeleteEntireStore() {
    await DataStore.clear(HolyNoteStore);
}
