/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import * as DataStore from "@api/DataStore";

import { removeRecentStickerByPackId } from "./components/recent";
import { StickerPack, StickerPackMeta } from "./types";
import { Mutex } from "./utils";
const mutex = new Mutex();

const PACKS_KEY = "Vencord-MoreStickers-Packs";

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
export async function saveStickerPack(sp: StickerPack): Promise<void> {
    const meta = stickerPackToMeta(sp);

    await Promise.all([
        DataStore.set(`${sp.id}`, sp),
        (async () => {
            const unlock = await mutex.lock();

            try {
                const packs = (await DataStore.get(PACKS_KEY) ?? null) as (StickerPackMeta[] | null);
                await DataStore.set(PACKS_KEY, packs === null ? [meta] : [...packs, meta]);
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
export async function getStickerPackMetas(): Promise<StickerPackMeta[]> {
    const packs = (await DataStore.get(PACKS_KEY)) ?? null as (StickerPackMeta[] | null);
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
export async function deleteStickerPack(id: string): Promise<void> {
    await Promise.all([
        DataStore.del(id),
        removeRecentStickerByPackId(id),
        (async () => {
            const unlock = await mutex.lock();

            try {
                const packs = (await DataStore.get(PACKS_KEY) ?? null) as (StickerPackMeta[] | null);
                if (packs === null) return;
                await DataStore.set(PACKS_KEY, packs.filter(p => p.id !== id));
            } finally {
                unlock();
            }
        })()
    ]);
}
