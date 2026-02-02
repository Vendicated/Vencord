/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { UserData } from "@song-spotlight/api/structs";
import { showToast, Toasts, UserStore } from "@webpack/common";

import { useAuthorizationStore } from "./store/AuthorizationStore";
import { useSongStore } from "./store/SongStore";
import { logger } from "./utils";

export const apiConstants = {
    api: "https://dc.songspotlight.nexpid.xyz/",
    oauth2: {
        clientId: "1157745434140344321",
        redirectURL: "https://dc.songspotlight.nexpid.xyz/api/auth/authorize",
    },
    songLimit: 6,
};

export async function authFetch(_url: string | URL, options?: RequestInit) {
    const url = new URL(_url);

    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                ...options?.headers,
                authorization: useAuthorizationStore.getState().getToken(),
            } as any,
        });

        if (res.ok) return res;

        // not modified
        if (res.status === 304) return null;

        const text = await res.text();
        showToast(
            !text.includes("<body>") && res.status >= 400 && res.status <= 599
                ? `Song Spotlight: ${text}`
                : `Song Spotlight fetch error at ${url.pathname}`,
            Toasts.Type.FAILURE,
        );

        logger.error(
            "Got an authFetch response error",
            options?.method ?? "GET",
            url.toString(),
            res.status,
            text,
        );
        throw new Error(text);
    } catch (error) {
        // dedupe this code?
        showToast(`Song Spotlight: ${error}`, Toasts.Type.FAILURE);

        logger.error(
            "Got an authFetch request error",
            options?.method ?? "GET",
            url.toString(),
            error,
        );
        throw error;
    }
}

export async function getData(): Promise<UserData | undefined> {
    return await authFetch(new URL("api/data", apiConstants.api), {
        headers: {
            "if-modified-since": useSongStore.getState().self?.at,
        } as any,
    }).then(async res => {
        if (!res) return useSongStore.getState().self?.data;

        const data = await res.json();
        useSongStore.getState().update({
            data,
            at: res.headers.get("last-modified") || undefined,
        });
        return data;
    });
}
export async function listData(userId: string): Promise<UserData | undefined> {
    if (userId === UserStore.getCurrentUser()?.id) return await getData();

    return await authFetch(new URL(`api/data/${userId}`, apiConstants.api), {
        headers: {
            "if-modified-since": useSongStore.getState().users[userId]?.at,
        } as any,
    }).then(async res => {
        if (!res) return useSongStore.getState().users[userId]?.data;

        const data = await res.json();
        useSongStore.getState().update({
            userId,
            data,
            at: res.headers.get("last-modified") || undefined,
        });
        return data;
    });
}
export async function saveData(data: UserData): Promise<true> {
    return await authFetch(new URL("api/data", apiConstants.api), {
        method: "PUT",
        body: JSON.stringify(data),
        headers: {
            "content-type": "application/json",
        },
    })
        .then(res => res?.json())
        .then(json => {
            useSongStore
                .getState().update({
                    data,
                    at: new Date().toUTCString(),
                });
            return json;
        });
}
export async function deleteData(): Promise<true> {
    return await authFetch(new URL("api/data", apiConstants.api), {
        method: "DELETE",
    })
        .then(res => res?.json())
        .then(json => {
            useSongStore.getState().delete();
            return json;
        });
}
