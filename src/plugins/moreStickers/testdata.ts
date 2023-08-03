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

import { setRecentStickers } from "./components/recent";
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
