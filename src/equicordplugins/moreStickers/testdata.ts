/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { setRecentStickers } from "./components";
import {
    convert,
    getStickerPackById
} from "./lineStickers";
import {
    deleteStickerPack,
    getStickerPackMetas,
    saveStickerPack
} from "./stickers";
import { StickerPack } from "./types";

export async function initTest() {
    console.log("initTest.");

    console.log("Clearing recent stickers.");
    setRecentStickers([]);

    // Clear all sticker packs
    console.log("Clearing all sticker packs.");
    const stickerPackMetas = await getStickerPackMetas();
    for (const meta of stickerPackMetas) {
        await deleteStickerPack(meta.id);
    }

    // Add test sticker packs
    console.log("Adding test sticker packs.");
    const lineStickerPackIds = [
        "22814489", // LV.47
        "22567773", // LV.46
        "22256215", // LV.45
        "21936635", // LV.44
        "21836565", // LV.43
    ];
    const ps: Promise<StickerPack | null>[] = [];
    for (const id of lineStickerPackIds) {
        ps.push((async () => {
            try {
                const lsp = await getStickerPackById(id);
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

    console.log("Clearing recent stickers.");
    setRecentStickers([]);

    // Clear all sticker packs
    console.log("Clearing all sticker packs.");
    const stickerPackMetas = await getStickerPackMetas();
    for (const meta of stickerPackMetas) {
        await deleteStickerPack(meta.id);
    }
}
