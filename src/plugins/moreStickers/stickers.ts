import { Sticker, StickerPack, StickerPackMeta } from "./types";
import { Mutex } from "./mutex";

import * as DataStore from "@api/DataStore";
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
  * Save a sticker pack
  *
  * @param {StickerPack} sp The StickerPack to save.
  * @return {Promise<void>}
  */
export async function saveStickerPack(sp: StickerPack) {
    const meta = stickerPackToMeta(sp);

    await Promise.all([
        DataStore.set(`${sp.id}`, sp),
        (async () => {
            const unlock = await mutex.lock();
            const packs = await DataStore.get(PACKS_KEY) as (StickerPackMeta[] | undefined);
            await DataStore.set(PACKS_KEY, packs === undefined ? [meta] : [...packs, meta]);
            unlock();
        })()
    ]);
}

/**
  * Get sticker packs' metadata
  *
  * @return {Promise<StickerPackMeta[]>}
  */
export async function getStickerPacks(): Promise<StickerPackMeta[]> {
    const packs = await DataStore.get(PACKS_KEY) as (StickerPackMeta[] | undefined);
    return packs ?? [];
}

/**
 * Get a sticker pack
 * 
 * @param {string} id The id of the sticker pack.
 * @return {Promise<StickerPack | undefined>}
 * */
export async function getStickerPack(id: string): Promise<StickerPack | undefined> {
    return await DataStore.get(id) as StickerPack | undefined;
}