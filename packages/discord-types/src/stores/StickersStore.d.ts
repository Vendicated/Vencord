import { FluxStore, GuildSticker, PremiumStickerPack, Sticker } from "..";
import { LoadState } from "../../enums";

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

export interface StickerMetadataEntry {
    type: number;
    value: string;
}

export class StickersStore extends FluxStore {
    hasLoadedStickerPacks: boolean;
    isFetchingStickerPacks: boolean;
    isLoaded: boolean;
    loadState: LoadState;

    getAllGuildStickers(): StickerGuildMap;
    getAllPackStickers(): StickerPackMap;
    getPremiumPacks(): PremiumStickerPack[];
    getRawStickersByGuild(): StickerGuildMap;
    getStickerById(id: string): Sticker | undefined;
    getStickerMetadataArrays(): [Record<string, StickerMetadataEntry[]>, Record<string, StickerMetadataEntry[]>];
    getStickerPack(id: string): PremiumStickerPack | undefined;
    getStickersByGuildId(guildId: string): Sticker[] | undefined;
    isPremiumPack(id: string): boolean;
}
