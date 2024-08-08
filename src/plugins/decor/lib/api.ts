/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { API_URL } from "./constants";
import { useAuthorizationStore } from "./stores/AuthorizationStore";

export interface Preset {
    id: string;
    name: string;
    description: string | null;
    decorations: Decoration[];
    authorIds: string[];
}

export interface Decoration {
    hash: string;
    animated: boolean;
    alt: string | null;
    authorId: string | null;
    reviewed: boolean | null;
    presetId: string | null;
}

export interface NewDecoration {
    file: File;
    alt: string | null;
}

export async function fetchApi(url: RequestInfo, options?: RequestInit) {
    const res = await fetch(url, {
        ...options,
        headers: {
            ...options?.headers,
            Authorization: `Bearer ${useAuthorizationStore.getState().token}`
        }
    });

    if (res.ok) return res;
    else throw new Error(await res.text());
}

export async function getUsersDecorations(ids?: string[]): Promise<Record<string, string | null>> {
    if (ids?.length === 0) return {};

    const url = new URL(API_URL + "/users");
    if (ids && ids.length !== 0) url.searchParams.set("ids", JSON.stringify(ids));

    return (await fetch(url)).json();
}

export const getUserDecorations = async (id: string = "@me"): Promise<Decoration[]> =>
    (await fetchApi(API_URL + `/users/${id}/decorations`)).json();

export const getUserDecoration = async (id: string = "@me"): Promise<Decoration | null> =>
    (await fetchApi(API_URL + `/users/${id}/decoration`)).json();

export async function setUserDecoration(decoration: Decoration | NewDecoration | null, id: string = "@me"): Promise<string | Decoration> {
    const formData = new FormData();

    if (!decoration) {
        formData.append("hash", "null");
    } else if ("hash" in decoration) {
        formData.append("hash", decoration.hash);
    } else if ("file" in decoration) {
        formData.append("image", decoration.file);
        formData.append("alt", decoration.alt ?? "null");
    }

    const res = await fetchApi(API_URL + `/users/${id}/decoration`, { method: "PUT", body: formData });
    return decoration && "file" in decoration
        ? res.json()
        : res.text();
}

export const getDecoration = async (hash: string): Promise<Decoration> =>
    (await fetch(API_URL + `/decorations/${hash}`)).json();

export async function deleteDecoration(hash: string) {
    await fetchApi(API_URL + `/decorations/${hash}`, { method: "DELETE" });
}

export const getPresets = async (): Promise<Preset[]> =>
    (await fetch(API_URL + "/decorations/presets")).json();
