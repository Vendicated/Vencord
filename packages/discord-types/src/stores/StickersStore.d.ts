import { FluxStore, GuildSticker, PremiumStickerPack, Sticker } from "..";

export type StickerGuildMap = Map<string, GuildSticker[]>;

export class StickersStore extends FluxStore {
    getAllGuildStickers(): StickerGuildMap;
    getRawStickersByGuild(): StickerGuildMap;
    getPremiumPacks(): PremiumStickerPack[];

    getStickerById(id: string): GuildSticker | undefined;
    getStickerPack(id: string): PremiumStickerPack | undefined;
    getStickersByGuildId(guildId: string): GuildSticker[] | undefined;

    isPremiumPack(id: string): boolean;
}
