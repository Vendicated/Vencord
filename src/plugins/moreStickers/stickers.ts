type LineSticker = {
    animationUrl: string,
    fallbackStaticUrl?: string,
    id: string;
    popupUrl: string;
    soundUrl: string;
    staticUrl: string;
    type: string;
};

type LineStickerPack = {
    title: string;
    author: {
        name: string;
        url: string;
    },
    id: string;
    mainImage: LineSticker;
    stickers: LineSticker[];
};

/**
  * Get stickers from LINE
  *
  * @param {string} id The id of the sticker pack.
  * @return {LineStickerPack} The sticker pack.
  */
async function getLineStickers(id: string) {
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
    };

    return stickerPack;
}