import { FluxStore } from "..";

export class SelectedChannelStore extends FluxStore {
    getChannelId(e?: never): string;
    getLastChannelFollowingDestination(): unknown;
    getLastSelectedChannelId(): string;
    getMostRecentSelectedTextChannelId(e: never): unknown;
    getVoiceChannelId(): string | undefined;
    initialize(): void;
}
