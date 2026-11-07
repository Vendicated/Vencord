import { FluxStore, Message } from "..";

export type ChannelPinsState = "LOADING" | "LOADED_HAS_MORE" | "LOADING_FINISHED" | "FAILED";

export interface ChannelPin {
    pinnedAt: Date;
    message: Message;
}

export interface ChannelPins {
    id: string;
    items: ChannelPin[];
    state: ChannelPinsState;
    guildId: string | undefined;
}

export class ChannelPinsStore extends FluxStore {
    getPins(channelId: string): ChannelPins | undefined;
}
