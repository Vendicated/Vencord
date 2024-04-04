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

import { LineEmoji, LineEmojiPack, Sticker, StickerPack } from "./types";
import { corsFetch } from "./utils";

export interface StickerCategory {
    title: string;
    id: number;
    packs: {
        title: string;
        id: string;
        img: string;
    }[];
}

/**
 * Get ID of sticker pack from a URL
 *
 * @param url The URL to get the ID from.
 * @returns {string} The ID.
 * @throws {Error} If the URL is invalid.
 */

export function getIdFromUrl(url: string): string {
    const re = /^https:\/\/store\.line\.me\/emojishop\/product\/([a-z0-9]+)\/.*$/;
    const match = re.exec(url);
    if (match === null) {
        throw new Error("Invalid URL");
    }
    return match[1];
}

/**
 * Convert LineEmojiPack id to StickerPack id
 *
 * @param id The id to convert.
 * @returns {string} The converted id.
 */

function toStickerPackId(id: string): string {
    return "Vencord-MoreStickers-Line-Emoji-Pack-" + id;
}

/**
 * Convert LineEmoji id to Sticker id
 *
 * @param stickerId The id to convert.
 * @param lineEmojiPackId The id of the LineEmojiPack.
 * @returns {string} The converted id.
 */

function toStickerId(stickerId: string, lineEmojiPackId: string): string {
    return "Vencord-MoreStickers-Line-Emoji" + lineEmojiPackId + "-" + stickerId;
}

/**
  * Convert LineEmoji to Sticker
  *
  * @param {LineEmoji} s The LineEmoji to convert.
  * @return {Sticker} The sticker.
  */
export function convertSticker(s: LineEmoji): Sticker {
    return {
        id: toStickerId(s.id, s.stickerPackId),
        image: s.animationUrl || s.staticUrl,
        title: s.id,
        stickerPackId: toStickerPackId(s.stickerPackId),
        isAnimated: !!s.animationUrl
    };
}

/**
  * Convert LineEmojiPack to StickerPack
  *
  * @param {LineEmojiPack} sp The LineEmojiPack to convert.
  * @return {StickerPack} The sticker pack.
  */
export function convert(sp: LineEmojiPack): StickerPack {
    return {
        id: toStickerPackId(sp.id),
        title: sp.title,
        author: sp.author,
        logo: convertSticker(sp.mainImage),
        stickers: sp.stickers.map(convertSticker)
    };
}

/**
  * Get stickers from given HTML
  *
  * @param {string} html The HTML.
  * @return {Promise<LineEmojiPack>} The sticker pack.
  */
export function parseHtml(html: string): LineEmojiPack {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const mainImage = JSON.parse((doc.querySelector("[ref=mainImage]") as HTMLElement)?.dataset?.preview ?? "null") as LineEmoji;
    const { id } = mainImage;

    const stickers =
        [...doc.querySelectorAll('.FnStickerPreviewItem')]
            .map(x => JSON.parse((x as HTMLElement).dataset.preview ?? "null"))
            .filter(x => x !== null)
            .map(x => ({ ...x, stickerPackId: id })) as LineEmoji[];

    const stickerPack = {
        title: doc.querySelector("[data-test=emoji-name-title]")?.textContent ?? "null",
        author: {
            name: doc.querySelector("[data-test=emoji-author]")?.textContent ?? "null",
            url: "https://store.line.me/" + (doc.querySelector("[data-test=emoji-author]")?.getAttribute("href") ?? "null")
        },
        id,
        mainImage,
        stickers
    } as LineEmojiPack;

    return stickerPack;
}

export function isLineEmojiPackHtml(html: string): boolean {
    return html.includes("data-test=\"emoji-name-title\"");
}

/**
  * Get stickers from LINE
  *
  * @param {string} id The id of the sticker pack.
  * @return {Promise<LineEmojiPack>} The sticker pack.
  */
export async function getStickerPackById(id: string, region = "en"): Promise<LineEmojiPack> {
    const res = await corsFetch(`https://store.line.me/emojishop/product/${id}/${region}`);
    const html = await res.text();

    return parseHtml(html);
}
