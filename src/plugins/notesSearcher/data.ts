/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Constants, FluxDispatcher, GuildStore, RestAPI, SnowflakeUtils, UserStore, UserUtils, useState } from "@webpack/common";
import { waitForStore } from "webpack/common/internal";

import { refreshNotesData } from "./components/NotesDataModal";
import * as t from "./noteStore";

let NoteStore: t.NoteStore;

waitForStore("NoteStore", s => NoteStore = s);

export const getNotes = () => {
    return NoteStore.getNotes();
};

export const onNoteUpdate = () => {
    refreshNotesData();
};

export const updateNote = (userId: string, note: string | null) => {
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

type Dispatch = ReturnType<typeof useState<any>>[1];

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

const stop = () => {
    cacheProcessNeedStop = false;
    isRunning = false;
    states.setRunning?.(false);
};

export const cacheUsers = async (onlyMissing = false) => {
    isRunning = true;
    states.setRunning?.(true);

    onlyMissing || usersCache.clear();

    const toRequest: string[] = [];

    for (const userId of Object.keys(getNotes())) {
        const user = UserStore.getUser(userId);

        if (user) {
            usersCache.set(user.id, {
                globalName: (user as any).globalName,
                username: user.username,
            });
            continue;
        }

        toRequest.push(userId);
    }

    if (usersCache.size >= Object.keys(getNotes()).length) {
        stop();
        states.setCacheStatus?.(usersCache.size);
        return;
    }

    states.setCacheStatus?.(usersCache.size);

    const sentNonce = SnowflakeUtils.fromTimestamp(Date.now());

    const allGuildIds = Object.keys(GuildStore.getGuilds());
    let count = allGuildIds.length * Math.ceil(toRequest.length / 100);

    const processed = new Set<string>();

    const callback = async ({ chunks }) => {
        for (const chunk of chunks) {
            if (cacheProcessNeedStop) {
                stop();
                FluxDispatcher.unsubscribe("GUILD_MEMBERS_CHUNK_BATCH", callback);
                break;
            }

            const { nonce, members } = chunk;

            if (nonce !== sentNonce) {
                return;
            }

            members.forEach(member => {
                if (processed.has(member.user.id)) return;

                processed.add(member.user.id);

                usersCache.set(member.id, {
                    globalName: (member as any).globalName,
                    username: member.username,
                });

                states.setCacheStatus?.(usersCache.size);
            });

            if (--count === 0) {
                const userIds = Object.keys(getNotes());

                if (usersCache.size !== userIds.length) {
                    for (const userId of userIds) {
                        if (cacheProcessNeedStop) {
                            stop();
                            FluxDispatcher.unsubscribe("GUILD_MEMBERS_CHUNK_BATCH", callback);
                            break;
                        }

                        const user = await fetchUser(userId);

                        if (user) {
                            usersCache.set(user.id, {
                                globalName: (user as any).globalName,
                                username: user.username,
                            });

                            states.setCacheStatus?.(usersCache.size);
                        }
                    }
                }

                stop();
                FluxDispatcher.unsubscribe("GUILD_MEMBERS_CHUNK_BATCH", callback);
            }
        }
    };

    FluxDispatcher.subscribe("GUILD_MEMBERS_CHUNK_BATCH", callback);

    for (let i = 0; i < toRequest.length; i += 100) {
        FluxDispatcher.dispatch({
            type: "GUILD_MEMBERS_REQUEST",
            guildIds: allGuildIds,
            userIds: toRequest.slice(i, i + 100),
            nonce: sentNonce,
        });
    }
};
