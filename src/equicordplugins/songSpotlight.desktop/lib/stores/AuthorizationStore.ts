/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { proxyLazy } from "@utils/lazy";
import { UserStore, zustandCreate, zustandPersist } from "@webpack/common";

import { PersistedZustandStore, ZustandDefinition } from "./zustand";

interface AuthorizationState {
    tokens: Record<string, string>;
    getToken(): string | undefined;
    setToken(token: string): void;
    deleteToken(): void;
    isAuthorized(): boolean;
}

export const useAuthorizationStore: PersistedZustandStore<AuthorizationState> = proxyLazy(() =>
    zustandCreate(
        zustandPersist(
            ((set, get) => ({
                tokens: {},
                getToken() {
                    return get().tokens[UserStore.getCurrentUser()?.id];
                },
                setToken(token) {
                    const userId = UserStore.getCurrentUser()?.id;
                    if (userId) {
                        set({
                            tokens: Object.assign(get().tokens, {
                                [userId]: token,
                            }),
                        });
                    }
                },
                deleteToken() {
                    set({ tokens: {} });
                },
                isAuthorized() {
                    return !!get().getToken();
                },
            })) as ZustandDefinition<AuthorizationState>,
            {
                name: "songspotlight-auth",
                storage: {
                    async getItem(name: string) {
                        return (await DataStore.get(name)) ?? null;
                    },
                    async setItem(name: string, value: string) {
                        return await DataStore.set(name, value);
                    },
                    async removeItem(name: string) {
                        return await DataStore.del(name);
                    },
                },
                partialize: ({ tokens }) => ({ tokens }),
            },
        ),
    )
);
