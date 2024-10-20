/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LineSticker, LineStickerPack, Sticker, StickerPack } from "./types";
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
    const re = /^https:\/\/store\.line\.me\/stickershop\/product\/([a-z0-9]+)\/.*$/;
    const match = re.exec(url);
    if (match === null) {
        throw new Error("Invalid URL");
    }
    return match[1];
}

/**
 * Convert LineStickerPack id to StickerPack id
 *
 * @param id The id to convert.
 * @returns {string} The converted id.
 */

function toStickerPackId(id: string): string {
    return "Vencord-MoreStickers-Line-Pack-" + id;
}

/**
 * Convert LineSticker id to Sticker id
 *
 * @param stickerId The id to convert.
 * @param lineStickerPackId The id of the LineStickerPack.
 * @returns {string} The converted id.
 */

function toStickerId(stickerId: string, lineStickerPackId: string): string {
    return "Vencord-MoreStickers-Line-Sticker" + lineStickerPackId + "-" + stickerId;
}

/**
  * Convert LineSticker to Sticker
  *
  * @param {LineSticker} s The LineSticker to convert.
  * @return {Sticker} The sticker.
  */
export function convertSticker(s: LineSticker): Sticker {
    return {
        id: toStickerId(s.id, s.stickerPackId),
        image: s.animationUrl || s.staticUrl,
        title: s.id,
        stickerPackId: toStickerPackId(s.stickerPackId),
        isAnimated: !!s.animationUrl
    };
}

/**
  * Convert LineStickerPack to StickerPack
  *
  * @param {LineStickerPack} sp The LineStickerPack to convert.
  * @return {StickerPack} The sticker pack.
  */
export function convert(sp: LineStickerPack): StickerPack {
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
  * @return {Promise<LineStickerPack>} The sticker pack.
  */
export function parseHtml(html: string): LineStickerPack {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const mainImage = JSON.parse((doc.querySelector("[ref=mainImage]") as HTMLElement)?.dataset?.preview ?? "null") as LineSticker;
    const { id } = mainImage;

    const stickers =
        [...doc.querySelectorAll('[data-test="sticker-item"]')]
            .map(x => JSON.parse((x as HTMLElement).dataset.preview ?? "null"))
            .filter(x => x !== null)
            .map(x => ({ ...x, stickerPackId: id })) as LineSticker[];

    const stickerPack = {
        title: doc.querySelector("[data-test=\"sticker-name-title\"]")?.textContent ?? "null",
        author: {
            name: doc.querySelector("[data-test=\"sticker-author\"]")?.textContent ?? "null",
            url: "https://store.line.me/" + (doc.querySelector("[data-test=\"sticker-author\"]")?.getAttribute("href") ?? "null")
        },
        id,
        mainImage,
        stickers
    } as LineStickerPack;

    return stickerPack;
}

export function isLineStickerPackHtml(html: string): boolean {
    return html.includes("data-test=\"sticker-name-title\"");
}

/**
  * Get stickers from LINE
  *
  * @param {string} id The id of the sticker pack.
  * @return {Promise<LineStickerPack>} The sticker pack.
  */
export async function getStickerPackById(id: string, region = "en"): Promise<LineStickerPack> {
    const res = await corsFetch(`https://store.line.me/stickershop/product/${id}/${region}`);
    const html = await res.text();

    return parseHtml(html);
}
