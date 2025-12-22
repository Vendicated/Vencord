import { FluxStore } from "..";

export const enum RelationshipType {
    NONE = 0,
    FRIEND = 1,
    BLOCKED = 2,
    INCOMING_REQUEST = 3,
    OUTGOING_REQUEST = 4,
    IMPLICIT = 5,
    SUGGESTION = 6
}

export class RelationshipStore extends FluxStore {
    getBlockedIDs(): string[];
    getBlockedOrIgnoredIDs(): string[];
    getFriendCount(): number;
    getFriendIDs(): string[];
    getIgnoredIDs(): string[];

    getMutableRelationships(): Map<string, number>;
    getNickname(userId: string): string;
    getOriginApplicationId(applicationId: string): string;
    getOutgoingCount(): number;
    getPendingCount(): number;
    getPendingIgnoredCount(): number;
    getRelationshipCount(): number;

    /** @returns Enum value from constants.RelationshipTypes */
    getRelationshipType(userId: string): RelationshipType;
    getSince(userId: string): string;
    getSinces(): Record<number, string>;
    getSpamCount(): number;
    getVersion(): number;
    getPendingCount(): number;
    getRelationshipCount(): number;

    isBlocked(userId: string): boolean;
    isBlockedForMessage(userId: string): boolean;

    /**
     * @see {@link isBlocked}
     * @see {@link isIgnored}
     */
    isBlockedOrIgnored(userId: string): boolean;
    isBlockedOrIgnoredForMessage(userId: string): boolean;

    isFriend(userId: string): boolean;
    isIgnored(userId: string): boolean;
    isIgnoredForMessage(userId: string): boolean;
    isStranger(userId: string): boolean;
    isSpam(userId: string): boolean;
    isUnfilteredPendingIncoming(userId: string): boolean;
}
