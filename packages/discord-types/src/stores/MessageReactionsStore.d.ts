import { FluxStore, ReactionEmoji, User } from "..";

/** 0 = normal, 1 = burst, 2 = vote */
export type ReactionType = 0 | 1 | 2;

export class MessageReactionsStore extends FluxStore {
    /** returns a map of user ids to users, undefined while lurking the guild */
    getReactions(channelId: string, messageId: string, emoji: ReactionEmoji, limit: number, type: ReactionType): Map<string, User> | undefined;
}
