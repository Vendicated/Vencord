import { FluxStore } from "..";

export class TypingStore extends FluxStore {
    /**
     * returns a map of user ids to timeout ids
     */
    getTypingUsers(channelId: string): Record<string, number>;
    isTyping(channelId: string, userId: string): boolean;
}
