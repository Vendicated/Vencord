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

export interface LineSticker {
    animationUrl: string,
    fallbackStaticUrl?: string,
    id: string;
    popupUrl: string;
    soundUrl: string;
    staticUrl: string;
    type: string;
    stickerPackId: LineStickerPack["id"];
}

export interface LineStickerPack {
    title: string;
    author: {
        name: string;
        url: string;
    },
    id: string;
    mainImage: LineSticker;
    stickers: LineSticker[];
}

export interface Sticker {
    id: string;
    image: string;
    title: string;
    stickerPackId: StickerPackMeta["id"];
}

export interface StickerPackMeta {
    id: string;
    title: string;
    author?: {
        name: string;
        url?: string;
    };
    logo: Sticker;
}

export interface StickerPack extends StickerPackMeta {
    stickers: Sticker[];
}
