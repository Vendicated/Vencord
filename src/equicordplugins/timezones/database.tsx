/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

type CacheEntry = {
    value: string | null;
    expires: number;
};

import { DataStore } from "@api/index";
import { openModal } from "@utils/modal";
import { OAuth2AuthorizeModal, showToast, Toasts } from "@webpack/common";

export const DOMAIN = "https://timezone.creations.works";
export const REDIRECT_URI = `${DOMAIN}/auth/discord/callback`;
export const CLIENT_ID = "1377021506810417173";

export const DATASTORE_KEY = "vencord-database-timezones";
export let databaseTimezones: Record<string, CacheEntry> = {};
(async () => {
    databaseTimezones = await DataStore.get<Record<string, CacheEntry>>(DATASTORE_KEY) || {};
})();

const pendingRequests: Record<string, Promise<string | null>> = {};

export async function setUserDatabaseTimezone(userId: string, timezone: string | null) {
    databaseTimezones[userId] = {
        value: timezone,
        expires: Date.now() + 60 * 60 * 1000 // 1 hour
    };
    await DataStore.set(DATASTORE_KEY, databaseTimezones);
}

export async function getTimezone(userId: string): Promise<string | null> {
    const now = Date.now();

    const cached = databaseTimezones[userId];
    if (cached && now < cached.expires) return cached.value;

    if (!pendingRequests[userId]) {
        pendingRequests[userId] = (async () => {
            const res = await fetch(`${DOMAIN}/get?id=${userId}`, {
                headers: { Accept: "application/json" }
            });

            let value: string | null = null;
            if (res.ok) {
                const json = await res.json();
                if (json?.timezone && typeof json.timezone === "string") {
                    value = json.timezone;
                }
            }

            setUserDatabaseTimezone(userId, value);
            delete pendingRequests[userId];
            return value;
        })();
    }

    return pendingRequests[userId];
}

export async function setTimezone(timezone: string): Promise<boolean> {
    const res = await fetch(`${DOMAIN}/set?timezone=${encodeURIComponent(timezone)}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        credentials: "include"
    });

    return res.ok;
}

export async function deleteTimezone(): Promise<boolean> {
    const res = await fetch(`${DOMAIN}/delete`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        credentials: "include"
    });

    return res.ok;
}

export function authModal(callback?: () => void) {
    openModal(modalProps => (
        <OAuth2AuthorizeModal
            {...modalProps}
            clientId={CLIENT_ID}
            redirectUri={REDIRECT_URI}
            responseType="code"
            scopes={["identify"]}
            permissions={0n}
            cancelCompletesFlow={false}
            callback={async (res: any) => {
                try {
                    const url = new URL(res.location);

                    const r = await fetch(url, {
                        credentials: "include",
                        headers: { Accept: "application/json" }
                    });

                    const json = await r.json();
                    if (!r.ok) {
                        showToast(json.message ?? "Authorization failed", Toasts.Type.FAILURE);
                        return;
                    }

                    showToast("Authorization successful!", Toasts.Type.SUCCESS);
                    callback?.();
                } catch (e) {
                    showToast("Unexpected error during authorization", Toasts.Type.FAILURE);
                }
            }}
        />
    ));
}

