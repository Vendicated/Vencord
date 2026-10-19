/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { proxyLazy } from "@utils/lazy";
import { UserStore, zustandCreate } from "@webpack/common";

import { API_URL } from "../constants";
import { useAuthorizationStore } from "./AuthorizationStore";

export interface RemoteStreak {
    id: string;
    user_a_id: string;
    user_b_id: string;
    count: number;
    last_streak_date: string | null;
    user_a_today: boolean;
    user_b_today: boolean;
    today_date: string | null;
}

export interface StreaksState {
    streaks: Record<string, RemoteStreak>;
    fetch: () => Promise<void>;
    update: (recipientId: string) => Promise<void>;
    refresh: (recipientId: string) => Promise<void>;
    migrate: () => Promise<void>;
    clear: () => void;
}

export const useStreaksStore = proxyLazy(() => zustandCreate((set: any, get: any) => ({
    streaks: {},
    clear: () => set({ streaks: {} }),
    async fetch() {
        const { token } = useAuthorizationStore.getState();
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/streaks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data: RemoteStreak[] = await res.json();
                const myId = UserStore.getCurrentUser()?.id;
                const streaksMap: Record<string, RemoteStreak> = {};
                for (const s of data) {
                    const otherId = s.user_a_id === myId ? s.user_b_id : s.user_a_id;
                    streaksMap[otherId] = s;
                }
                set({ streaks: streaksMap });
            }
        } catch (e) {
            console.error("Failed to fetch streaks", e);
        }
    },
    async update(recipientId: string) {
        const { token } = useAuthorizationStore.getState();
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/streaks/${recipientId}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const streak: RemoteStreak = await res.json();
                set({ streaks: { ...get().streaks, [recipientId]: streak } });
            }
        } catch (e) {
            console.error("Failed to update streak", e);
        }
    },
    async refresh(recipientId: string) {
        const { token } = useAuthorizationStore.getState();
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/streaks/${recipientId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const streak: RemoteStreak = await res.json();
                set({ streaks: { ...get().streaks, [recipientId]: streak } });
            }
        } catch (e) {
            console.error("Failed to refresh streak", e);
        }
    },
    async migrate() {
        const { token } = useAuthorizationStore.getState();
        if (!token) return;

        const legacyData = await DataStore.get("vc-streaks-data");
        if (!legacyData || Object.keys(legacyData).length === 0) return;

        try {
            const res = await fetch(`${API_URL}/streaks/migrate`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(legacyData)
            });

            if (res.ok) {
                await DataStore.del("vc-streaks-data");
                console.log("Successfully migrated local streaks to API");
            }
        } catch (e) {
            console.error("Failed to migrate streaks", e);
        }
    }
} as StreaksState)));
