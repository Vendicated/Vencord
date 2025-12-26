import { FluxStore } from "..";

export interface ChannelFollowingDestination {
    guildId?: string;
    channelId?: string;
}

export class SelectedChannelStore extends FluxStore {
    getChannelId(guildId?: string | null): string | undefined;
    getCurrentlySelectedChannelId(guildId?: string): string | undefined;
    getLastChannelFollowingDestination(): ChannelFollowingDestination;
    getLastSelectedChannelId(guildId?: string): string | undefined;
    getLastSelectedChannels(guildId?: string): string | undefined;
    getMostRecentSelectedTextChannelId(guildId: string): string | null;
    getVoiceChannelId(): string | null;
}
