import {
    getStickerPackMetas,
    deleteStickerPack,
    saveStickerPack
} from "./stickers";

import {
    getStickerPack,
    convert
} from "./lineStickers";

import { StickerPack } from "./types";

export async function initTest() {
    console.log("initTest.");

    // Clear all sticker packs
    console.log("Clearing all sticker packs.");
    const stickerPackMetas = await getStickerPackMetas();
    for (const meta of stickerPackMetas) {
        await deleteStickerPack(meta.id);
    }

    // Add test sticker packs
    console.log("Adding test sticker packs.");
    const lineStickerPackIds = [
        "22814489", // LV.47 野生喵喵怪
        "22567773", // LV.46 野生喵喵怪
        "22256215", // LV.45 野生喵喵怪
        "21936635", // LV.44 野生喵喵怪
        "21836565", // LV.43 野生喵喵怪
    ];
    const ps: Promise<StickerPack | null>[] = [];
    for (const id of lineStickerPackIds) {
        ps.push((async () => {
            try {
                const lsp = await getStickerPack(id);
                const sp = convert(lsp);
                return sp;
            } catch (e) {
                console.error("Failed to fetch sticker pack: " + id);
                console.error(e);
                return null;
            }
        })());
    }
    const stickerPacks = (await Promise.all(ps)).filter(sp => sp !== null) as StickerPack[];

    console.log("Saving test sticker packs.");
    for (const sp of stickerPacks) {
        await saveStickerPack(sp);
    }

    console.log(await getStickerPackMetas());
}

export async function clearTest() {
    console.log("clearTest.");

    // Clear all sticker packs
    console.log("Clearing all sticker packs.");
    const stickerPackMetas = await getStickerPackMetas();
    for (const meta of stickerPackMetas) {
        await deleteStickerPack(meta.id);
    }
}