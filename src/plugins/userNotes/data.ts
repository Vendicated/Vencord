/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    clear,
    createStore,
    del,
    entries,
    set,
    setMany,
} from "@api/DataStore";

const NotesStore = createStore("UserNotesData", "UserNotesStore");

const usersNotes = new Map<string, string>();

const cacheUsersNotes = async () => {
    entries(NotesStore).then(usersNotesDB => {
        usersNotesDB.forEach(([userId, userNotes]) => {
            usersNotes.set(userId as string, userNotes);
        });
    });
};

cacheUsersNotes();

export const getUserNotes = (userId: string): string | undefined => {
    return usersNotes.get(userId);
};

export const saveUserNotes = async (userId: string, userNotes: string) => {
    if (userNotes.trim() === "") {
        usersNotes.delete(userId);
        await del(userId, NotesStore);
    } else {
        usersNotes.set(userId, userNotes);
        await set(userId, userNotes, NotesStore);
    }
};

export const clearUserNotes = async () => {
    usersNotes.clear();
    await clear(NotesStore);
};

export const transferUserNotes = async (regularUsersNotes: { [userId: string]: string; }) => {
    await setMany(Object.keys(regularUsersNotes).reduce((usersNotesDB, userId) => {
        const userNotes = regularUsersNotes[userId];
        usersNotesDB.push([userId, userNotes]);
        usersNotes.set(userId, userNotes);

        return usersNotesDB;
    }, [] as Array<[string, string]>), NotesStore);
};
