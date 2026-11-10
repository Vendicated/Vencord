import { FluxStore, Sticker } from "..";
import { EmojiFrecency, PendingUsage } from "./EmojiStore";

export interface StickersPersistedState {
    pendingUsages: PendingUsage[];
}

export interface StickerFrecency extends Omit<EmojiFrecency, "_frequently" | "lookupKey" | "frequently"> {
    _frequently: Sticker[];
    lookupKey: (stickerId: string) => Sticker | undefined;
    get frequently(): Sticker[];
}

export class StickersPersistedStore extends FluxStore {
    getState(): StickersPersistedState;
    hasPendingUsage(): boolean;
    get stickerFrecencyWithoutFetchingLatest(): StickerFrecency;
}
