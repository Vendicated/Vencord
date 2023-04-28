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

import { Sticker } from "../types";

// The ID of recent sticker and recent sticker pack
export const RECENT_STICKERS_ID = "recent";
export const RECENT_STICKERS_TITLE = "Recently Used";

const KEY = "Vencord-MoreStickers-RecentStickers";

export async function getRecentStickers(): Promise<Sticker[]> {
    return (await DataStore.get(KEY)) ?? [];
}

export async function setRecentStickers(stickers: Sticker[]): Promise<void> {
    await DataStore.set(KEY, stickers);
}

export async function addRecentSticker(sticker: Sticker): Promise<void> {
    const stickers = await getRecentStickers();
    const index = stickers.findIndex(s => s.id === sticker.id);
    if (index !== -1) {
        stickers.splice(index, 1);
    }
    stickers.unshift(sticker);
    while (stickers.length > 16) {
        stickers.pop();
    }
    await setRecentStickers(stickers);
}
