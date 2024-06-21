/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Constants, RestAPI, UserUtils, useState } from "@webpack/common";

export const NotesMap = new Map<string, string>();

export const updateNote = (userId: string, note: string) => {
    if (!note || note === "")
        NotesMap.delete(userId);
    else
        NotesMap.set(userId, note);
};

export const putNote = (userId: string, note: string | null) => {
    RestAPI.put({
        url: Constants.Endpoints.NOTE(userId),
        body: { note },
        oldFormErrors: true
    });
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

type Dispatch = ReturnType<typeof useState<any>>[1]

const states: {
    setRunning?: Dispatch;
    setCacheStatus?: Dispatch,
} = {};

export const setupStates = ({
    setRunning,
    setCacheStatus,
}: {
    setRunning: Dispatch,
    setCacheStatus: Dispatch,
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

    for (const userId of NotesMap.keys()) {
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
