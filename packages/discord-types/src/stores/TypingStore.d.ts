import { FluxStore } from "..";

export class TypingStore extends FluxStore {
    /**
     * returns a map of user ids to timeout ids
     */
    getTypingUsers(channelId: string): Record<string, number>;
    /**
     * returns a map of channel ids to maps of user ids to timeout ids
     */
    getTypingUsersByGuild(guildId: string): Record<string, Record<string, number>>;
    isTyping(channelId: string, userId: string): boolean;
    getCustomTypingIndicatorConfig(userId: string): unknown;
}
