/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

import { removeRecentStickerByPackId } from "./components";
import { StickerPack, StickerPackMeta } from "./types";
import { Mutex } from "./utils";
const mutex = new Mutex();

const PACKS_KEY = "MoreStickers:Packs";

/**
  * Convert StickerPack to StickerPackMeta
  *
  * @param {StickerPack} sp The StickerPack to convert.
  * @return {StickerPackMeta} The sticker pack metadata.
  */
function stickerPackToMeta(sp: StickerPack): StickerPackMeta {
    return {
        id: sp.id,
        title: sp.title,
        author: sp.author,
        logo: sp.logo
    };
}

/**
  * Save a sticker pack to the DataStore
  *
  * @param {StickerPack} sp The StickerPack to save.
  * @return {Promise<void>}
  */
export async function saveStickerPack(sp: StickerPack, packsKey: string = PACKS_KEY): Promise<void> {
    const meta = stickerPackToMeta(sp);

    await Promise.all([
        DataStore.set(`${sp.id}`, sp),
        (async () => {
            const unlock = await mutex.lock();

            try {
                const packs = (await DataStore.get(packsKey) ?? null) as (StickerPackMeta[] | null);
                await DataStore.set(packsKey, packs === null ? [meta] : [...packs, meta]);
            } finally {
                unlock();
            }
        })()
    ]);
}

/**
  * Get sticker packs' metadata from the DataStore
  *
  * @return {Promise<StickerPackMeta[]>}
  */
export async function getStickerPackMetas(packsKey: string | undefined = PACKS_KEY): Promise<StickerPackMeta[]> {
    const packs = (await DataStore.get(packsKey)) ?? null as (StickerPackMeta[] | null);
    return packs ?? [];
}

/**
 * Get a sticker pack from the DataStore
 *
 * @param {string} id The id of the sticker pack.
 * @return {Promise<StickerPack | null>}
 * */
export async function getStickerPack(id: string): Promise<StickerPack | null> {
    return (await DataStore.get(id)) ?? null as StickerPack | null;
}

/**
 * Get a sticker pack meta from the DataStore
 *
 * @param {string} id The id of the sticker pack.
 * @return {Promise<StickerPackMeta | null>}
 * */
export async function getStickerPackMeta(id: string): Promise<StickerPackMeta | null> {
    const sp = await getStickerPack(id);
    return sp ? stickerPackToMeta(sp) : null;
}

/**
 * Delete a sticker pack from the DataStore
 *
 * @param {string} id The id of the sticker pack.
 * @return {Promise<void>}
 * */
export async function deleteStickerPack(id: string, packsKey: string = PACKS_KEY): Promise<void> {
    await Promise.all([
        DataStore.del(id),
        removeRecentStickerByPackId(id),
        (async () => {
            const unlock = await mutex.lock();

            try {
                const packs = (await DataStore.get(packsKey) ?? null) as (StickerPackMeta[] | null);
                if (packs === null) return;
                await DataStore.set(packsKey, packs.filter(p => p.id !== id));
            } finally {
                unlock();
            }
        })()
    ]);
}
