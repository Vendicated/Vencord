import { FluxStore } from "..";

export interface Sticker {
    available: boolean;
    description: string;
    id: string;
    name: string;
    tags: string;
    type: number;
    t: "Sticker";
    format_type: number;
    image: string;
    title: string;
    stickerPackId: StickerPackMeta["id"];
    guild_id: string;
    filename?: string;
    isAnimated?: boolean;
}

export interface StickerPackMeta {
    id: string;
    title: string;
    author?: {
        name: string;
        url?: string;
    };
    logo: Sticker;

    dynamic?: DynamicStickerPackMeta["dynamic"];
}

export interface DynamicStickerPackMeta extends StickerPackMeta {
    dynamic: {
        version?: string;
        refreshUrl: string;
        authHeaders?: Record<string, string>;
    };
}

export interface StickerPack extends StickerPackMeta {
    stickers: Sticker[];
}


export interface StickerCategoryType {
    id: string;
    name: string;
    iconUrl?: string;
}

export class StickerStore extends FluxStore {
    getStickerById(id: string): Sticker | undefined;
    getStickerPack(id: string): StickerPack | undefined;
    getPremiumPacks(): StickerPack[];
    isPremiumPack(id: string): boolean;
    getRawStickersByGuild(): Map<string, Sticker[]>;
    getAllStickersIterator(): IterableIterator<Sticker>;
    getAllGuildStickers(): Map<string, Sticker[]>;
    getStickersByGuildId(id: string): Sticker[] | undefined;
}
