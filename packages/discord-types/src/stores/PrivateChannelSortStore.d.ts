import { FluxStore } from "..";

export interface PrivateChannelSortEntry {
    channelId: string;
    lastMessageId: string;
    isFavorite: boolean;
    isRequest: boolean;
}

export class PrivateChannelSortStore extends FluxStore {
    getPrivateChannelIds(): string[];
    getSortedChannels(): [PrivateChannelSortEntry[], PrivateChannelSortEntry[]];
    serializeForOverlay(): Record<string, string>;
}
