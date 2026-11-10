import { FluxStore } from "..";

export interface TopEmojiState {
    /** emoji ids sorted by rank */
    topEmojisByGuildId: Record<string, string[]>;
}

export class TopEmojiStore extends FluxStore {
    getState(): TopEmojiState;
    getTopEmojiIdsByGuildId(guildId: string): string[] | undefined;
    getIsFetching(guildId: string): boolean | undefined;
}
