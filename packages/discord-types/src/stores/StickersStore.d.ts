import { FluxStore, GuildSticker, PremiumStickerPack, Sticker } from "..";

export type StickerGuildMap = Map<string, GuildSticker[]>;
export type StickerPackMap = Map<string, Sticker[]>;

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

export class StickersStore extends FluxStore {
    hasLoadedStickerPacks: boolean;
    isFetchingStickerPacks: boolean;
    isLoaded: boolean;
    loadState: number;

    getAllGuildStickers(): StickerGuildMap;
    getAllPackStickers(): StickerPackMap;
    getPremiumPacks(): PremiumStickerPack[];
    getRawStickersByGuild(): StickerGuildMap;
    getStickerById(id: string): Sticker | undefined;
    // TODO: type
    getStickerMetadataArrays(): any[];
    getStickerPack(id: string): PremiumStickerPack | undefined;
    getStickersByGuildId(guildId: string): Sticker[] | undefined;
    isPremiumPack(id: string): boolean;
}
