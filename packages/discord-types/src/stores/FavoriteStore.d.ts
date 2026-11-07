import { Channel, FluxStore } from "..";
import { ChannelType } from "../../enums";

export interface FavoriteChannel {
    id: string;
    nickname: string | null;
    /** 0 = unset, 1 = reference to the original channel, 2 = category */
    type: 0 | 1 | 2;
    channelType: ChannelType | undefined;
    order: number;
    parentId: string | null;
}

export class FavoriteStore extends FluxStore {
    getFavoriteChannels(): Record<string, FavoriteChannel>;
    get favoriteGuildMuted(): boolean;
    get favoriteGuildEnabled(): boolean;
    get autoAddJoinedThreads(): boolean;
    isFavorite(channelId: string | null | undefined): boolean;
    isChannelOrParentFavorited(channel: Channel): boolean;
    getFavorite(channelId: string | null | undefined): FavoriteChannel | undefined;
    getCategoryRecord(channelId: string): Channel | null;
    getNickname(channelId: string | null | undefined): string | undefined;
    getFavoritesCount(): number;
    /** excludes categories */
    getFavoritesCountAgainstLimit(): number;
    hasStoredFavorites(): boolean;
}
