/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Constants, FluxDispatcher, GuildStore, RestAPI, SnowflakeUtils, UserStore, UserUtils } from "@webpack/common";
import { waitForStore } from "webpack/common/internal";

import { refreshNotesData, refreshUsersCache } from "./components/NotesDataModal";
import * as t from "./types";

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
        body: { note: note !== "" ? note : null },
        oldFormErrors: true
    });
};

export const usersCache: t.UsersCache = new Map();

export const onUserUpdate = ({ user }: { user: t.User; }) => {
    if (!getNotes()[user.id]) return;

    // doesn't have .getAvatarURL
    const userFromStore = UserStore.getUser(user.id);

    if (!userFromStore) return;

    cacheUser(userFromStore);
};

const fetchUser = async (userId: string) => {
    for (let _ = 0; _ < 5; _++) {
        try {
            return await UserUtils.getUser(userId);
        } catch (error: any) {
            const wait = error?.body?.retry_after;

            if (!wait) return;

            await new Promise(resolve => setTimeout(resolve, wait * 1000 + 100));
        }
    }
};

const cacheUser = (user: t.User) => {
    usersCache.set(user.id, {
        id: user.id,
        globalName: user.globalName ?? user.username,
        username: user.username,
        avatar: user.getAvatarURL(void 0, void 0, false),
    });
};

export const cacheUsers = async () => {
    const toRequest: string[] = [];

    for (const userId of Object.keys(getNotes())) {
        const user = UserStore.getUser(userId);

        if (user) {
            cacheUser(user);
            continue;
        }

        toRequest.push(userId);
    }

    if (usersCache.size >= Object.keys(getNotes()).length) {
        return;
    }

    const sentNonce = SnowflakeUtils.fromTimestamp(Date.now());

    const allGuildIds = Object.keys(GuildStore.getGuilds());
    let count = allGuildIds.length * Math.ceil(toRequest.length / 100);

    const processed = new Set<string>();

    const callback = async ({ chunks }) => {
        for (const chunk of chunks) {
            const { nonce, members }: {
                nonce: string;
                members: {
                    user: t.User;
                }[];
            } = chunk;

            if (nonce !== sentNonce) {
                return;
            }

            members.forEach(({ user }) => {
                if (processed.has(user.id)) return;

                processed.add(user.id);

                cacheUser(UserStore.getUser(user.id));
            });

            refreshUsersCache();

            if (--count === 0) {
                FluxDispatcher.unsubscribe("GUILD_MEMBERS_CHUNK_BATCH", callback);

                const userIds = Object.keys(getNotes());

                if (usersCache.size !== userIds.length) {

                    for (const userId of userIds) {
                        if (usersCache.has(userId)) continue;

                        await new Promise(resolve => setTimeout(resolve, 1000));

                        const user = await fetchUser(userId);

                        if (user) {
                            cacheUser(user);
                            refreshUsersCache();
                        }
                    }

                } else
                    refreshUsersCache();
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
