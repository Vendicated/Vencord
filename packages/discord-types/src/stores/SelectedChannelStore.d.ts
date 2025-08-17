import { FluxStore } from "..";

export class SelectedChannelStore extends FluxStore {
    getChannelId(guildId?: string | null): string;
    getVoiceChannelId(): string | undefined;
    getCurrentlySelectedChannelId(guildId?: string): string | undefined;
    getMostRecentSelectedTextChannelId(guildId: string): string | undefined;
    getLastSelectedChannelId(guildId?: string): string;
    // yes this returns a string
    getLastSelectedChannels(guildId?: string): string;

    /** If you follow an announcement channel, this will return whichever channel you chose as destination */
    getLastChannelFollowingDestination(): { guildId?: string; channelId?: string; } | undefined;
}
