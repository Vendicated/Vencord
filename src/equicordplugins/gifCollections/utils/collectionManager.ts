/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Toasts } from "@webpack/common";

import { settings } from "../index";
import { Collection, Gif } from "../types";
import { getFormat } from "./getFormat";

export const DATA_COLLECTION_NAME = "gif-collections-collections";

// this is here bec async + react class component dont play nice and stutters happen. IF theres a better way of doing it pls let me know
export let cache_collections: Collection[] = [];

export const getCollections = async (): Promise<Collection[]> => (await DataStore.get<Collection[]>(DATA_COLLECTION_NAME)) ?? [];

export const getCollection = async (name: string): Promise<Collection | undefined> => {
    const collections = await getCollections();
    return collections.find(c => c.name === name);
};

export const getCachedCollection = (name: string): Collection | undefined => cache_collections.find(c => c.name === name);

export const createCollection = async (name: string, gifs: Gif[]): Promise<void> => {
    const collections = await getCollections();
    const duplicateCollection = collections.find(c => c.name === `${settings.store.collectionPrefix}${name}`);
    if (duplicateCollection)
        return Toasts.show({
            message: "That collection already exists",
            type: Toasts.Type.FAILURE,
            id: Toasts.genId(),
            options: {
                duration: 3000,
                position: Toasts.Position.BOTTOM
            }
        });

    // gifs shouldnt be empty because to create a collection you need to right click an image / gif and then create it yk. but cant hurt to have a null-conditional check RIGHT?
    const latestGifSrc = gifs[gifs.length - 1]?.src ?? settings.store.defaultEmptyCollectionImage;
    const collection: Collection = {
        name: `${settings.store.collectionPrefix}${name}`,
        src: latestGifSrc,
        format: getFormat(latestGifSrc),
        type: "Category",
        gifs,
        createdAt: Date.now(),
        lastUpdated: Date.now()
    };

    await DataStore.set(DATA_COLLECTION_NAME, [...collections, collection]);
    return await refreshCacheCollection();
};

export const addToCollection = async (name: string, gif: Gif): Promise<void> => {
    const collections = await getCollections();
    const collectionIndex = collections.findIndex(c => c.name === name);
    if (collectionIndex === -1) return console.warn("collection not found");

    collections[collectionIndex].gifs.push(gif);
    collections[collectionIndex].src = gif.src;
    collections[collectionIndex].format = getFormat(gif.src);
    collections[collectionIndex].lastUpdated = Date.now();

    gif.addedAt = Date.now();

    await DataStore.set(DATA_COLLECTION_NAME, collections);
    return await refreshCacheCollection();
};

export const renameCollection = async (oldName: string, newName: string): Promise<void> => {
    const collections = await getCollections();
    const collectionIndex = collections.findIndex(c => c.name === oldName);
    if (collectionIndex === -1) return console.warn("collection not found");

    collections[collectionIndex].name = `${settings.store.collectionPrefix}${newName}`;
    collections[collectionIndex].lastUpdated = Date.now();

    await DataStore.set(DATA_COLLECTION_NAME, collections);
    return await refreshCacheCollection();
};

export const removeFromCollection = async (id: string): Promise<void> => {
    const collections = await getCollections();
    const collectionIndex = collections.findIndex(c => c.gifs.some(g => g.id === id));
    if (collectionIndex === -1) return console.warn("collection not found");

    collections[collectionIndex].gifs = collections[collectionIndex].gifs.filter(g => g.id !== id);

    const collection = collections[collectionIndex];
    const latestGifSrc = collection.gifs.length ? collection.gifs[collection.gifs.length - 1].src : settings.store.defaultEmptyCollectionImage;
    collections[collectionIndex].src = latestGifSrc;
    collections[collectionIndex].format = getFormat(latestGifSrc);
    collections[collectionIndex].lastUpdated = Date.now();

    await DataStore.set(DATA_COLLECTION_NAME, collections);
    return await refreshCacheCollection();
};

export const deleteCollection = async (name: string): Promise<void> => {
    const collections = await getCollections();
    const col = collections.filter(c => c.name !== name);
    await DataStore.set(DATA_COLLECTION_NAME, col);
    await refreshCacheCollection();
};

export const refreshCacheCollection = async (): Promise<void> => {
    cache_collections = await getCollections();
};

export const fixPrefix = async (newPrefix: string): Promise<void> => {
    const normalizedPrefix = newPrefix.replace(/:+$/, "") + ":";

    const collections = await getCollections();

    collections.forEach(c => {
        const nameParts = c.name.split(":");
        c.name = `${normalizedPrefix}${nameParts[nameParts.length - 1]}`;
    });

    await DataStore.set(DATA_COLLECTION_NAME, collections);
    await refreshCacheCollection();
};

export const getItemCollectionNameFromId = (id: string): string | undefined => {
    const collections = cache_collections;
    const collection = collections.find(c => c.gifs.some(g => g.id === id));
    return collection?.name;
};

export const getGifById = (id: string): Gif | undefined => {
    const collections = cache_collections;
    const gif = collections.flatMap(c => c.gifs).find(g => g.id === id);
    return gif;
};

export const moveGifToCollection = async (gifId: string, fromCollection: string, toCollection: string): Promise<void> => {
    const collections = await getCollections();
    const fromCollectionIndex = collections.findIndex(c => c.name === fromCollection);
    const toCollectionIndex = collections.findIndex(c => c.name === toCollection);
    if (fromCollectionIndex === -1 || toCollectionIndex === -1) return console.warn("collection not found");

    const gifIndex = collections[fromCollectionIndex].gifs.findIndex(g => g.id === gifId);
    if (gifIndex === -1) return console.warn("gif not found");

    const gif = collections[fromCollectionIndex].gifs[gifIndex];
    gif.addedAt = Date.now();
    collections[fromCollectionIndex].gifs.splice(gifIndex, 1);
    collections[toCollectionIndex].gifs.push(gif);

    const fromCollectionLatestGifSrc = collections[fromCollectionIndex].gifs.length ? collections[fromCollectionIndex].gifs[collections[fromCollectionIndex].gifs.length - 1].src : settings.store.defaultEmptyCollectionImage;
    collections[fromCollectionIndex].src = fromCollectionLatestGifSrc;
    collections[fromCollectionIndex].format = getFormat(fromCollectionLatestGifSrc);
    collections[fromCollectionIndex].lastUpdated = Date.now();

    const toCollectionLatestGifSrc = collections[toCollectionIndex].gifs.length ? collections[toCollectionIndex].gifs[collections[toCollectionIndex].gifs.length - 1].src : settings.store.defaultEmptyCollectionImage;
    collections[toCollectionIndex].src = toCollectionLatestGifSrc;
    collections[toCollectionIndex].format = getFormat(toCollectionLatestGifSrc);
    collections[toCollectionIndex].lastUpdated = Date.now();

    await DataStore.set(DATA_COLLECTION_NAME, collections);
    return await refreshCacheCollection();
};
