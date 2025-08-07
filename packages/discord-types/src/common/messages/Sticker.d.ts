import { StickerFormatType, StickerType } from "../../../enums";

interface BaseSticker {
    asset: string;
    available: boolean;
    description: string;
    format_type: StickerFormatType;
    id: string;
    name: string;
    sort_value?: number;
    /** a comma separated string */
    tags: string;
}

export interface PackSticker extends BaseSticker {
    pack_id: string;
    type: StickerType.STANDARD;
}

export interface GuildSticker extends BaseSticker {
    guild_id: string;
    type: StickerType.GUILD;
}

export type Sticker = PackSticker | GuildSticker;

export interface PremiumStickerPack {
    banner_asset_id?: string;
    cover_sticker_id?: string;
    description: string;
    id: string;
    name: string;
    sku_id: string;
    stickers: PackSticker[];
}
