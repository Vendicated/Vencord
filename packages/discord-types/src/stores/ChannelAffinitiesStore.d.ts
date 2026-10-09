import { FluxStore } from "..";

export interface ChannelAffinity {
    channelId: string;
    score: number;
}

export interface ChannelAffinitiesState {
    channelAffinities: ChannelAffinity[];
    lastFetched: number;
}

export class ChannelAffinitiesStore extends FluxStore {
    compare(firstChannelId: string, secondChannelId: string): number;
    getChannelAffinities(): ChannelAffinity[];
    getChannelAffinitiesMap(): Map<string, ChannelAffinity>;
    getChannelAffinity(channelId: string): ChannelAffinity | undefined;
    getState(): ChannelAffinitiesState;
    isFetching(): boolean;
    shouldFetch(): boolean | undefined;
}
