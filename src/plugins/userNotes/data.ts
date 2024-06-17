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
import { UserUtils, useState } from "@webpack/common";

const NotesStore = createStore("UserNotesData", "UserNotesStore");

export const usersNotes = new Map<string, string>();

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

export const deleteUserNotes = async (userId: string) => {
    if (!usersNotes.get(userId)) return;

    usersNotes.delete(userId);
    await del(userId, NotesStore);
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

export const usersCache = new Map<string, {
    globalName?: string,
    username: string;
}>();

const fetchUser = async (userId: string) => {
    for (let _ = 0; _ < 10; _++) {
        try {
            return await UserUtils.getUser(userId);
        } catch (error: any) {
            const wait = error?.body?.retry_after;

            if (!wait) break;

            await new Promise(resolve => setTimeout(resolve, wait * 1000 + 50));
        }
    }
};

const states: {
    setRunning?: ReturnType<typeof useState<any>>[1];
    setCacheStatus?: ReturnType<typeof useState<any>>[1],
} = {};

export const setupStates = ({
    setRunning,
    setCacheStatus,
}: {
    setRunning: ReturnType<typeof useState<any>>[1],
    setCacheStatus: ReturnType<typeof useState<any>>[1],
}) => {
    states.setRunning = setRunning;
    states.setCacheStatus = setCacheStatus;
};

let isRunning = false;

export const getRunning = () => {
    return isRunning;
};

let cacheProcessNeedStop = false;

export const stopCacheProcess = () => {
    cacheProcessNeedStop = true;
};

export const cacheUsers = async (onlyMissing = false) => {
    isRunning = true;
    states.setRunning?.(true);

    onlyMissing || usersCache.clear();

    for (const userId of usersNotes.keys()) {
        if (cacheProcessNeedStop) {
            cacheProcessNeedStop = false;
            break;
        }

        if (onlyMissing && usersCache.get(userId)) continue;

        const user = await fetchUser(userId);

        if (user) {
            usersCache.set(user.id, {
                globalName: (user as any).globalName,
                username: user.username,
            });

            states.setCacheStatus?.(usersCache.size);
        }
    }

    isRunning = false;
    states.setRunning?.(false);
};
