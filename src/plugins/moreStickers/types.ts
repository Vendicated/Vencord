export interface LineSticker {
    animationUrl: string,
    fallbackStaticUrl?: string,
    id: string;
    popupUrl: string;
    soundUrl: string;
    staticUrl: string;
    type: string;
};

export interface LineStickerPack {
    title: string;
    author: {
        name: string;
        url: string;
    },
    id: string;
    mainImage: LineSticker;
    stickers: LineSticker[];
};

export interface Sticker {
    id: string;
    url: string;
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