import { FluxStore } from "..";

export class SelectedChannelStore extends FluxStore {
    getChannelId(guildId?: string): string;
    getLastChannelFollowingDestination(): unknown;
    getLastSelectedChannelId(): string;
    getMostRecentSelectedTextChannelId(guildId: string): unknown;
    getVoiceChannelId(): string | undefined;
}
