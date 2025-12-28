import { FluxStore, GuildSticker, PremiumStickerPack, Sticker } from "..";

export type StickerGuildMap = Map<string, GuildSticker[]>;
export type StickerPackMap = Map<string, Sticker[]>;

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
