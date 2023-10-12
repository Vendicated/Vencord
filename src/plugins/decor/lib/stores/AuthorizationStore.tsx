/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { proxyLazy } from "@utils/lazy";
import { UserStore } from "@webpack/common";
import type { StateStorage } from "zustand/middleware";

import showAuthorizationModal from "../utils/showAuthorizationModal";
import { create, persist } from "../zustand";

// TODO: Persist token in DataStore

interface AuthorizationState {
    token: string | null;
    tokens: Record<string, string>;
    init: () => void;
    authorize: () => void;
    setToken: (token: string) => void;
    isAuthorized: () => boolean;
}

const indexedDBStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        return DataStore.get(name).then(v => v ?? null);
    },
    setItem: async (name: string, value: string): Promise<void> => {
        await DataStore.set(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        await DataStore.del(name);
    },
};

// TODO: Move switching accounts subscription inside the store?
export const useAuthorizationStore = proxyLazy(() => create<AuthorizationState>(
    persist(
        (set, get) => ({
            token: null,
            tokens: {},
            init: () => { set({ token: get().tokens[UserStore.getCurrentUser().id] ?? null }); },
            setToken: (token: string) => set({ token, tokens: { ...get().tokens, [UserStore.getCurrentUser().id]: token } }),
            authorize: () => void showAuthorizationModal(),
            isAuthorized: () => !!get().token,
        }),
        {
            name: "decor-auth",
            getStorage: () => indexedDBStorage,
            partialize: state => ({ tokens: state.tokens }),
            onRehydrateStorage: () => state => state?.init()
        }
    )
));
