import { FluxStore, GuildSticker, PremiumStickerPack, Sticker } from "..";

export type StickerGuildMap = Map<string, GuildSticker[]>;

export class StickersStore extends FluxStore {
    getAllGuildStickers(): StickerGuildMap;
    getRawStickersByGuild(): StickerGuildMap;
    getPremiumPacks(): PremiumStickerPack[];

    getStickerById(id: string): Sticker | undefined;
    getStickerPack(id: string): PremiumStickerPack | undefined;
    getStickersByGuildId(guildId: string): Sticker[] | undefined;

    isPremiumPack(id: string): boolean;
}
