/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";
import { FluxDispatcher, UserStore } from "@webpack/common";

import { Decoration, deleteDecoration, getUserDecoration, getUserDecorations, NewDecoration, setUserDecoration } from "../api";
import { SKU_ID } from "../constants";
import decorationToString from "../utils/decorationToString";
import { create } from "../zustand";

interface UserDecorationsState {
    decorations: Decoration[];
    selectedDecoration: Decoration | null;
    fetch: () => Promise<void>;
    delete: (decoration: Decoration | string) => Promise<void>;
    create: (decoration: NewDecoration) => Promise<void>;
    select: (decoration: Decoration | null) => Promise<void>;
    clear: () => void;
}

export const useUserDecorationsStore = proxyLazy(() => create<UserDecorationsState>((set, get) => ({
    decorations: [],
    selectedDecoration: null,
    fetch: async () => set({ decorations: await getUserDecorations(), selectedDecoration: await getUserDecoration() }),
    async create(newDecoration: NewDecoration) {
        const decoration = (await setUserDecoration(newDecoration)) as Decoration;
        set({ decorations: [...get().decorations, decoration] });
    },
    async delete(decoration: Decoration | string) {
        const hash = typeof decoration === "object" ? decoration.hash : decoration;
        await deleteDecoration(hash);

        const { selectedDecoration, decorations } = get();
        const newState = {
            decorations: decorations.filter(d => d.hash !== hash),
            selectedDecoration: selectedDecoration?.hash === hash ? null : selectedDecoration
        };

        set(newState);
    },
    async select(decoration: Decoration | null) {
        if (get().selectedDecoration === decoration) return;
        set({ selectedDecoration: decoration });
        setUserDecoration(decoration);

        const user = UserStore.getCurrentUser() as any;
        user.avatarDecoration = decoration ? { asset: decorationToString(decoration), skuId: SKU_ID } : null;
        user.avatarDecorationData = user.avatarDecoration;
        FluxDispatcher.dispatch({ type: "CURRENT_USER_UPDATE", user });
    },
    clear: () => set({ decorations: [], selectedDecoration: null })
})));
