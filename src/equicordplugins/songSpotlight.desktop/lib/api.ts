/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { UserData } from "@song-spotlight/api/structs";
import { showToast, Toasts, UserStore } from "@webpack/common";

import { useAuthorizationStore } from "./stores/AuthorizationStore";
import { useSongStore } from "./stores/SongStore";

const api = "https://dc.songspotlight.nexpid.xyz/";
export const apiConstants = {
    api,
    oauth2: {
        clientId: "1157745434140344321",
        redirectURL: `${api}api/auth/authorize`,
    },
    songLimit: 6,
};

let refreshPromise: Promise<boolean> | undefined;
async function refreshAccessToken() {
    const token = useAuthorizationStore.getState().getToken();
    if (!token) return false;

    return refreshPromise ??= fetch(new URL("api/auth/refresh", apiConstants.api), {
        method: "POST",
        headers: {
            "X-Refresh-Token": token.refresh,
        },
        body: token.access,
    }).then(async res => {
        if (!res.ok) return false;

        const access = await res.text();
        useAuthorizationStore.getState().setToken(access, token.refresh);
        return true;
    }).finally(() => refreshPromise = undefined);
}

export async function authFetch(url: string | URL, options?: RequestInit, retried = false) {
    url = new URL(url);
    try {
        const token = useAuthorizationStore.getState().getToken();
        const res = await fetch(url, {
            ...options,
            headers: {
                ...options?.headers,
                Authorization: token?.access,
            } as HeadersInit,
        });

        if (res.ok) return res;

        // not modified
        if (res.status === 304) return null;

        const text = await res.text();

        // unauthorized
        if (res.status === 401) {
            const retry = !retried && await refreshAccessToken();
            if (retry) return await authFetch(url, options, true);
            else {
                useAuthorizationStore.getState().deleteTokens();
                showToast("You have been signed out from Song Spotlight. Please sign in again.", Toasts.Type.FAILURE);
            }
        } else {
            showToast(
                !text.includes("<body>") && res.status >= 400 && res.status <= 599
                    ? `Song Spotlight: ${text}`
                    : `Song Spotlight fetch error at ${url.pathname}`,
                Toasts.Type.FAILURE,
            );
        }

        throw new Error(text);
    } catch (error) {
        showToast(`Song Spotlight: ${error}`, Toasts.Type.FAILURE);

        throw error;
    }
}

export async function getData(): Promise<UserData | undefined> {
    return await authFetch(new URL("api/data", apiConstants.api), {
        headers: {
            "If-Modified-Since": useSongStore.getState().self?.at,
        } as HeadersInit,
    }).then(async res => {
        if (!res) return useSongStore.getState().self?.data;

        const data = await res.json();
        useSongStore.getState().update({
            data,
            at: res.headers.get("Last-Modified") || undefined,
        });
        return data;
    });
}
export async function listData(userId: string): Promise<UserData | undefined> {
    if (userId === UserStore.getCurrentUser()?.id) return await getData();

    return await authFetch(new URL(`api/data/${userId}`, apiConstants.api), {
        headers: {
            "If-Modified-Since": useSongStore.getState().users[userId]?.at,
        } as HeadersInit,
    }).then(async res => {
        if (!res) return useSongStore.getState().users[userId]?.data;

        const data = await res.json();
        useSongStore.getState().update({
            userId,
            data,
            at: res.headers.get("Last-Modified") || undefined,
        });
        return data;
    });
}
export async function saveData(data: UserData): Promise<true> {
    return await authFetch(new URL("api/data", apiConstants.api), {
        method: "PUT",
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json",
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
