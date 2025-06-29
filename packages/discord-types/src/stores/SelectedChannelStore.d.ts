import { FluxStore } from "..";

export class SelectedChannelStore extends FluxStore {
    getChannelId(e?: never): string;
    getLastChannelFollowingDestination(): unknown;
    getLastSelectedChannelId(): string;
    getMostRecentSelectedTextChannelId(guildId: string): unknown;
    getVoiceChannelId(): string | undefined;
    initialize(): void;
}
