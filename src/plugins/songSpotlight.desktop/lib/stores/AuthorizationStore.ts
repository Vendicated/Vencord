/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { proxyLazy } from "@utils/lazy";
import { UserStore, zustandCreate, zustandPersist } from "@webpack/common";

import { PersistedZustandStore, ZustandDefinition } from "./zustand";

export interface Token {
    access: string;
    refresh: string;
}

interface AuthorizationState {
    tokens: Record<string, Token>;
    getToken(): Token | undefined;
    setToken(access: string, refresh: string): void;
    deleteTokens(): void;
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
                setToken(access, refresh) {
                    const userId = UserStore.getCurrentUser()?.id;
                    if (userId) {
                        set({
                            tokens: {
                                ...get().tokens,
                                [userId]: { access, refresh },
                            },
                        });
                    }
                },
                deleteTokens() {
                    set({ tokens: {} });
                },
                isAuthorized() {
                    return !!get().getToken();
                },
            })) as ZustandDefinition<AuthorizationState>,
            {
                name: "songspotlight-auth",
                version: 1,
                migrate(persisted: any, version: number) {
                    if (version === 0) {
                        persisted.tokens = Object.fromEntries(
                            Object.entries(persisted.tokens).map(([userId, access]) => [userId, {
                                access,
                                refresh: "",
                            }]),
                        );
                    }

                    return persisted;
                },
                storage: {
                    async getItem(name: string) {
                        return (await DataStore.get(name)) ?? null;
                    },
                    async setItem(name: string, value: unknown) {
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
