/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";
import { FluxDispatcher, UserStore } from "@webpack/common";

import { Decoration, deleteDecoration, getUserDecoration, getUserDecorations, NewDecoration, setUserDecoration, users } from "../api";
import discordifyDecoration from "../utils/discordifyDecoration";
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

function updateCurrentUserAvatarDecoration(decoration: Decoration | null) {
    const user = UserStore.getCurrentUser() as any;
    user.avatarDecoration = decoration ? discordifyDecoration(decoration) : null;
    user.avatarDecorationData = user.avatarDecoration;
    FluxDispatcher.dispatch({ type: "CURRENT_USER_UPDATE", user });

    // HACK: Update user cache
    users.set(user.id, user);
}

export const useCurrentUserDecorationsStore = proxyLazy(() => create<UserDecorationsState>((set, get) => ({
    decorations: [],
    selectedDecoration: null,
    async fetch() {
        const decorations = await getUserDecorations();
        const selectedDecoration = await getUserDecoration();

        if (get().selectedDecoration?.hash !== selectedDecoration?.hash) updateCurrentUserAvatarDecoration(selectedDecoration);

        set({ decorations, selectedDecoration });
    },
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

        updateCurrentUserAvatarDecoration(decoration);
    },
    clear: () => set({ decorations: [], selectedDecoration: null })
})));
