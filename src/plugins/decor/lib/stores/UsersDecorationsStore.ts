/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { debounce } from "@utils/debounce";
import { proxyLazy } from "@utils/lazy";
import { useEffect, useState, zustandCreate } from "@webpack/common";
import { User } from "discord-types/general";

import { AvatarDecoration } from "../../";
import { getUsersDecorations } from "../api";
import { DECORATION_FETCH_COOLDOWN, SKU_ID } from "../constants";

interface UserDecorationData {
    asset: string | null;
    fetchedAt: Date;
}

interface UsersDecorationsState {
    usersDecorations: Map<string, UserDecorationData>;
    fetchQueue: Set<string>;
    bulkFetch: () => Promise<void>;
    fetch: (userId: string, force?: boolean) => Promise<void>;
    fetchMany: (userIds: string[]) => Promise<void>;
    get: (userId: string) => UserDecorationData | undefined;
    getAsset: (userId: string) => string | null | undefined;
    has: (userId: string) => boolean;
    set: (userId: string, decoration: string | null) => void;
}

export const useUsersDecorationsStore = proxyLazy(() => zustandCreate<UsersDecorationsState>((set, get) => ({
    usersDecorations: new Map<string, UserDecorationData>(),
    fetchQueue: new Set(),
    bulkFetch: debounce(async () => {
        const { fetchQueue, usersDecorations } = get();

        set({ fetchQueue: new Set() });

        const fetchIds = Array.from(fetchQueue);
        if (fetchIds.length === 0) return;
        const fetchedUsersDecorations = await getUsersDecorations(fetchIds);

        const newUsersDecorations = new Map(usersDecorations);

        for (const [userId, decoration] of Object.entries(fetchedUsersDecorations)) {
            newUsersDecorations.set(userId, { asset: decoration, fetchedAt: new Date() });
        }

        for (const fetchedId of fetchIds) {
            if (!newUsersDecorations.has(fetchedId)) newUsersDecorations.set(fetchedId, { asset: null, fetchedAt: new Date() });
        }

        set({ usersDecorations: newUsersDecorations });
    }),
    async fetch(userId: string, force: boolean = false) {
        const { usersDecorations, fetchQueue, bulkFetch } = get();

        if (usersDecorations.has(userId)) {
            const { fetchedAt } = usersDecorations.get(userId)!;
            if (!force && Date.now() - fetchedAt.getTime() < DECORATION_FETCH_COOLDOWN) return;
        }

        set({ fetchQueue: new Set(fetchQueue).add(userId) });
        bulkFetch();
    },
    async fetchMany(userIds) {
        if (!userIds.length) return;
        const { usersDecorations, fetchQueue, bulkFetch } = get();

        const newFetchQueue = new Set(fetchQueue);

        for (const userId of userIds) {
            if (usersDecorations.has(userId)) {
                const { fetchedAt } = usersDecorations.get(userId)!;
                if (Date.now() - fetchedAt.getTime() < DECORATION_FETCH_COOLDOWN) continue;
            }
            newFetchQueue.add(userId);
        }

        set({ fetchQueue: newFetchQueue });
        bulkFetch();
    },
    get(userId: string) { return get().usersDecorations.get(userId); },
    getAsset(userId: string) { return get().usersDecorations.get(userId)?.asset; },
    has(userId: string) { return get().usersDecorations.has(userId); },
    set(userId: string, decoration: string | null) {
        const { usersDecorations } = get();
        const newUsersDecorations = new Map(usersDecorations);

        newUsersDecorations.set(userId, { asset: decoration, fetchedAt: new Date() });
        set({ usersDecorations: newUsersDecorations });
    }
})));

export function useUserDecorAvatarDecoration(user?: User): AvatarDecoration | null | undefined {
    const [decorAvatarDecoration, setDecorAvatarDecoration] = useState<string | null>(user ? useUsersDecorationsStore.getState().getAsset(user.id) ?? null : null);

    useEffect(() => useUsersDecorationsStore.subscribe(
        state => {
            if (!user) return;
            const newDecorAvatarDecoration = state.getAsset(user.id);
            if (!newDecorAvatarDecoration) return;
            if (decorAvatarDecoration !== newDecorAvatarDecoration) setDecorAvatarDecoration(newDecorAvatarDecoration);
        }), []);

    useEffect(() => {
        if (!user) return;
        const { fetch: fetchUserDecorAvatarDecoration } = useUsersDecorationsStore.getState();
        fetchUserDecorAvatarDecoration(user.id);
    }, []);

    return decorAvatarDecoration ? { asset: decorAvatarDecoration, skuId: SKU_ID } : null;
}
