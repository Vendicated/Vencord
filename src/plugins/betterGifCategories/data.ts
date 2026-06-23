/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

import { getDataKey, gifKey, makeId } from "./helpers";


export interface Gif {
    format: number;
    src: string;
    width: number;
    height: number;
    order: number;
    url: string;
}

export interface GifCategory {
    id: string;
    name: string;
    gifs: Gif[];
}

let cache: GifCategory[] = [];

export async function loadCategories(): Promise<void> {
    cache = (await DataStore.get<GifCategory[]>(getDataKey())) ?? [];
}

async function persist(): Promise<void> {
    await DataStore.set(getDataKey(), cache);
}

export function getCategories(): GifCategory[] {
    return cache;
}

/**
 * Returns the names of all categories that contain this gif URL.
 * Used by the optional gifDescriptions integration.
 */
export function getCategoriesForGif(gifUrl: string): string[] {
    return cache
        .filter(c => c.gifs.some(g => gifKey(g) === gifUrl))
        .map(c => c.name);
}

export async function addCategory(name: string): Promise<GifCategory> {
    const category: GifCategory = { id: makeId(), name, gifs: [] };
    cache = [...cache, category];
    await persist();

    return category;
}

export async function deleteCategory(id: string): Promise<void> {
    cache = cache.filter(c => c.id !== id);
    await persist();
}

export async function renameCategory(id: string, name: string): Promise<void> {
    cache = cache.map(c => c.id === id ? { ...c, name } : c);
    await persist();
}

export async function reorderCategories(ids: string[]): Promise<void> {
    const map = new Map(cache.map(c => [c.id, c]));

    cache = ids.flatMap(id => {
        const c = map.get(id);

        return c ? [c] : [];
    });

    await persist();
}

/**
 * Also mirrors the gif into Discord's normal favorites
 */
export async function addGifToCategory(categoryId: string, gif: Gif): Promise<void> {
    cache = cache.map(c => {
        if (c.id !== categoryId) {
            return c;
        }

        if (c.gifs.some(g => gifKey(g) === gifKey(gif))) {
            return c; // no duplicates
        }

        // Prepend newest gif at position 0
        return {
            ...c, gifs: [
                { ...gif, order: 0 },
                ...c.gifs.map(g => ({ ...g, order: g.order + 1 })),
            ]
        };
    });

    await mirrorFavorite(gif);
    await persist();
}

/**
 * Does NOT unfavourite gif from user's favorites. To avoid overreaching, that task
 * is left for the user to decide
 */
export async function removeGifFromCategory(categoryId: string, gifUrl: string): Promise<void> {
    cache = cache.map(c =>
        c.id === categoryId
            ? { ...c, gifs: c.gifs.filter(g => gifKey(g) !== gifUrl) }
            : c
    );

    await persist();
}


async function mirrorFavorite(gif: Gif): Promise<void> {
    // TODO implement me
}
