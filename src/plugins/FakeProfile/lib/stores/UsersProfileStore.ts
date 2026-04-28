/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addProfileBadge, BadgePosition, removeProfileBadge } from "@api/Badges";
import { debounce } from "@shared/debounce";
import { proxyLazy } from "@utils/lazy";
import { User } from "@vencord/discord-types";
import { useEffect, useState, zustandCreate } from "@webpack/common";

import { settings } from "../../settings";
import { Badge, Decoration, getBadges, getEffects, getPresets, getUsers, ProfileEffects } from "../api";
import { FETCH_COOLDOWN } from "../constants";

interface UserData {
    profileEffectId?: string;
    banner?: string;
    avatar?: string;
    decoration?: string | null;
    nameplate?: string;
    fetchedAt: Date;
}

interface UsersDecorationsState {
    users: Map<string, UserData>;
    decorations: Map<string, Decoration>;
    profileEffects: Map<string, ProfileEffects>;
    badges: Map<string, Badge[]>;
    addedBadges: any[];
    fetchQueue: Set<string>;
    bulkFetch: () => Promise<void>;
    fetch: (userId: string, force?: boolean) => Promise<void>;
    fetchMany: (userIds: string[]) => Promise<void>;
    get: (userId: string) => UserData | undefined;
    getDecorAsset: (userId: string) => string | null | undefined;
    getEffectAsset: (userId: string) => string | undefined;
    set: (userId: string, data: Partial<UserData>) => void;
    fetchProfileEffects: () => Promise<void>;
    fetchDecorations: () => Promise<void>;
    fetchBadges: () => Promise<void>;
}

export const useUsersProfileStore = proxyLazy(() => zustandCreate((set: any, get: any) => ({
    users: new Map<string, UserData>(),
    decorations: new Map<string, Decoration>(),
    profileEffects: new Map<string, ProfileEffects>(),
    badges: new Map<string, Badge[]>(),
    addedBadges: [],
    fetchBadges: debounce(async () => {
        if (!settings.store.enableCustomBadges) return;

        const { addedBadges } = get();

        addedBadges.forEach(badge => removeProfileBadge(badge));

        const fetchedBadges = await getBadges();
        const newBadges = new Map(
            Object.entries(fetchedBadges).map(([key, value]) => [key, value])
        );

        const newAddedBadges: any[] = [];

        newBadges.forEach((userBadges, userId) => {
            if (Array.isArray(userBadges)) {
                userBadges.forEach(badge => {
                    const newBadge = {
                        iconSrc: badge.badge,
                        description: badge.tooltip,
                        position: BadgePosition.START,
                        shouldShow: ({ userId: badgeUserId }) => badgeUserId === userId,
                        ...(badge.badge_id && { id: badge.badge_id })
                    };
                    addProfileBadge(newBadge);
                    newAddedBadges.push(newBadge);
                });
            }
        });

        set({
            badges: newBadges,
            addedBadges: newAddedBadges,
        });
    }),
    fetchProfileEffects: debounce(async () => {
        const { profileEffects } = get();
        const fetchedProfileEffects = await getEffects();
        const newProfileEffects = new Map(
            Object.entries(fetchedProfileEffects).map(([key, value]) => [key, value])
        );
        set({
            profileEffects: newProfileEffects,
        });

    }),
    fetchDecorations: debounce(async () => {
        const { decorations } = get();
        const fetchedDecorations = await getPresets();
        const newDecorations = new Map(
            fetchedDecorations.map(decoration => [decoration.asset, decoration])
        );
        set({
            decorations: newDecorations,
        });

    }),
    fetchQueue: new Set(),
    bulkFetch: debounce(async () => {
        const { fetchQueue, users } = get();

        if (fetchQueue.size === 0) return;

        set({ fetchQueue: new Set() });

        const fetchIds = [...fetchQueue];
        const fetchedUsers = await getUsers(fetchIds);

        const newUsers = new Map(users);

        const now = new Date();
        for (const fetchId of fetchIds) {
            const newUser = fetchedUsers[fetchId] ?? null;
            newUsers.set(fetchId, newUser);
        }

        set({ users: newUsers });
    }),
    async fetch(userId: string, force: boolean = false) {
        const { users, fetchQueue, bulkFetch } = get();

        const { fetchedAt } = users.get(userId) ?? {};
        if (fetchedAt) {
            if (!force && Date.now() - fetchedAt.getTime() < FETCH_COOLDOWN) return;
        }

        set({ fetchQueue: new Set(fetchQueue).add(userId) });
        bulkFetch();
    },
    async fetchMany(userIds) {
        if (!userIds.length) return;
        const { users, fetchQueue, bulkFetch } = get();

        const newFetchQueue = new Set(fetchQueue);

        const now = Date.now();
        for (const userId of userIds) {
            const { fetchedAt } = users.get(userId) ?? {};
            if (fetchedAt) {
                if (now - fetchedAt.getTime() < FETCH_COOLDOWN) continue;
            }
            newFetchQueue.add(userId);
        }

        set({ fetchQueue: newFetchQueue });
        bulkFetch();
    },
    get(userId: string) { return get().users.get(userId); },
    getDecorAsset(userId: string) { return get().users.get(userId)?.decoration; },
    getEffectAsset(userId: string) { return get().users.get(userId)?.profileEffectId; },
    set(userId: string, data: Partial<UserData>) {
        const { users } = get();
        const newUsers = new Map(users);

        newUsers.set(userId, { ...data, fetchedAt: new Date() });
        set({ users: newUsers });
    }
} as UsersDecorationsState)));


export function useUserAvatarDecoration(user?: User): Decoration | null | undefined {
    try {
        const [AvatarDecoration, setAvatarDecoration] = useState<string | null>(user ? useUsersProfileStore.getState().getDecorAsset(user.id) ?? null : null);

        useEffect(() => {
            const destructor = (() => {
                try {
                    return useUsersProfileStore.subscribe(
                        state => {
                            if (!user) return;
                            const newAvatarDecoration = state.getDecorAsset(user.id);
                            if (!newAvatarDecoration) return;
                            if (AvatarDecoration !== newAvatarDecoration) setAvatarDecoration(newAvatarDecoration);
                        }
                    );
                } catch {
                    return () => { };
                }
            })();

            try {
                if (user) {
                    const { fetch: fetchuserAvatarDecoration } = useUsersProfileStore.getState();
                    fetchuserAvatarDecoration(user.id);
                }
            } catch { }

            return destructor;
        }, []);
        if (AvatarDecoration) {
            const decoration = useUsersProfileStore.getState().decorations.get(AvatarDecoration);
            if (!decoration) {
                useUsersProfileStore.getState().fetchDecorations();
                const decoration = useUsersProfileStore.getState().decorations.get(AvatarDecoration);
                return { asset: AvatarDecoration, skuId: decoration.skuId, animated: decoration.animated };
            }
            return { asset: AvatarDecoration, skuId: decoration.skuId, animated: decoration.animated };
        }
        return null;
    } catch (e) {
        console.error(e);
    }

    return null;
}
