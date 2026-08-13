import { FluxStore } from "..";

export interface ChannelFollowingDestination {
    guildId?: string;
    channelId?: string;
}

export class SelectedChannelStore extends FluxStore {
    getChannelId(guildId?: string | null): string;
    getVoiceChannelId(): string | undefined;
    getCurrentlySelectedChannelId(guildId?: string): string | undefined;
    getMostRecentSelectedTextChannelId(guildId: string): string | undefined;
    getLastSelectedChannelId(guildId?: string): string;
    getLastSelectedChannels(guildId?: string): string;
    getLastChannelFollowingDestination(): ChannelFollowingDestination | undefined;
}
