import { LineSticker, LineStickerPack, Sticker, StickerPack } from "./types";

const PREFIX = "Vencord-MoreStickers-Line-";
/**
  * Convert LineSticker to Sticker
  *
  * @param {LineSticker} sp The LineSticker to convert.
  * @return {Sticker} The sticker.
  */
export function convertSticker(s: LineSticker): Sticker {
    return {
        id: s.id,
        url: s.staticUrl
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
        id: PREFIX + sp.id,
        title: sp.title,
        author: sp.author,
        logo: convertSticker(sp.mainImage),
        stickers: sp.stickers.map(convertSticker)
    };
}

/**
  * Get stickers from LINE
  *
  * @param {string} id The id of the sticker pack.
  * @return {Promise<LineStickerPack>} The sticker pack.
  */
export async function getStickers(id: string): Promise<LineStickerPack> {
    const res = await fetch(`https://store.line.me/stickershop/product/${id}/en`);
    const html = await res.text();

    const doc = new DOMParser().parseFromString(html, "text/html");

    const stickers =
        [...doc.querySelectorAll(".FnStickerPreviewItem")]
            .map(x => JSON.parse((x as HTMLElement).dataset.preview ?? "null"))
            .filter(x => x !== null) as LineSticker[];

    const mainImage = JSON.parse((doc.querySelector("[ref=mainImage]") as HTMLElement)?.dataset?.preview ?? "null") as LineSticker;
    const stickerPack = {
        title: doc.querySelector("[data-test=sticker-name-title]")?.textContent ?? "null",
        author: {
            name: doc.querySelector("[data-test=sticker-author]")?.textContent ?? "null",
            url: "https://store.line.me/" + (doc.querySelector("[data-test=sticker-author]")?.getAttribute("href") ?? "null")
        },
        id,
        mainImage,
        stickers
    } as LineStickerPack;

    return stickerPack;
}