/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { UserData } from "@song-spotlight/api/structs";
import { proxyLazy } from "@utils/lazy";
import { UserStore, zustandCreate } from "@webpack/common";

import { ZustandDefinition, ZustandStore } from "./zustand";

interface Data {
    data: UserData;
    at?: string;
}

interface SongState {
    users: Record<string, Data>;
    self?: Data;
    update(props: {
        userId?: string;
        data: UserData;
        at?: string;
    }): void;
    delete(userId?: string): void;
    $refresh(): void;
}

export const useSongStore: ZustandStore<SongState> = proxyLazy(() =>
    zustandCreate(
        ((set, get) => ({
            users: {},
            update({ userId, data, at }) {
                userId ??= UserStore.getCurrentUser()?.id;
                if (userId) {
                    set({
                        users: Object.assign(get().users, {
                            [userId]: { data, at },
                        }),
                    });
                }
                get().$refresh();
            },
            delete(userId) {
                userId ??= UserStore.getCurrentUser()?.id;
                if (userId) {
                    const { users } = get();
                    delete users[userId];
                    set({ users });
                }
                get().$refresh();
            },
            $refresh() {
                set({
                    self: get().users[UserStore.getCurrentUser()?.id],
                });
            },
        })) as ZustandDefinition<SongState>,
    )
);
