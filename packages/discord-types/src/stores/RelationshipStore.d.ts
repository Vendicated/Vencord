import { FluxStore, Message } from "..";

export const enum RelationshipType {
    NONE = 0,
    FRIEND = 1,
    BLOCKED = 2,
    PENDING_INCOMING = 3,
    PENDING_OUTGOING = 4,
    IMPLICIT = 5,
    SUGGESTION = 6
}

export class RelationshipStore extends FluxStore {
    /** Returns whether the given user ID is a friend */
    isFriend(userId: string): boolean;
    /** Returns whether the given user ID is blocked or ignored */
    isBlockedOrIgnored(userId: string): boolean;
    /** Returns whether the author of the given message is blocked or ignored */
    isBlockedOrIgnoredForMessage(message: Message): boolean;
    /** Returns whether the given user ID is blocked */
    isBlocked(userId: string): boolean;
    /** Returns whether the author of the given message is blocked */
    isBlockedForMessage(message: Message): boolean;
    /** Returns whether the given user ID is ignored */
    isIgnored(userId: string): boolean;
    /** Returns whether the author of the given message is ignored */
    isIgnoredForMessage(message: Message): boolean;
    /** Returns whether the given user ID is a pending incoming friend request that is not spam or ignored */
    isUnfilteredPendingIncoming(userId: string): boolean;
    /** Returns the number of pending incoming friend requests that are not spam or ignored */
    getPendingCount(): number;
    /** Returns the number of incoming friend requests that are spam */
    getSpamCount(): number;
    /** Returns the number of incoming friend requests that are from ignored users */
    getPendingIgnoredCount(): number;
    /** Returns the number of outgoing friend requests */
    getOutgoingCount(): number;
    /** Returns the number of friends */
    getFriendCount(): number;
    /** Returns the number of relationships */
    getRelationshipCount(): number;
    /** Returns a map of user IDs to RelationshipType */
    getMutableRelationships(): Map<string, number>;
    /** Returns the version of the RelationshipStore */
    getVersion(): number;
    /** Returns whether the given user ID is spam */
    isSpam(userId: string): boolean;
    /** Returns the RelationshipType for the given user ID */
    getRelationshipType(userId: string): RelationshipType;
    /** Returns the friend nickname for the given user ID */
    getNickname(userId: string): string | undefined;
    /** Returns an ISO timestamp string of when the relationship with the given user ID started */
    getSince(userId: string): string | undefined;
    /** Returns a map of user IDs to ISO timestamp strings of when each relationship started */
    getSinces(): Record<string, string>;
    /** Returns a list of the user IDs of all friends */
    getFriendIDs(): string[];
    /** Returns a list of the user IDs of all blocked */
    getBlockedIDs(): string[];
    /** Returns a list of the user IDs of all ignored */
    getIgnoredIDs(): string[];
    /** Returns a list of the user IDs of all blocked or ignored */
    getBlockedOrIgnoredIDs(): string[];
    /** Returns the origin application ID for the given user ID */
    getOriginApplicationId(userId: string): string | undefined;
    /** Returns whether the given user ID is a stranger */
    isStranger(userId: string): boolean | undefined;
}
