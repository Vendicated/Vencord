import { FluxStore } from "..";

export class RelationshipStore extends FluxStore {
    getFriendIDs(): string[];
    getIgnoredIDs(): string[];
    getBlockedIDs(): string[];
    getBlockedOrIgnoredIDs(): string[];

    getPendingCount(): number;
    getRelationshipCount(): number;

    /** Related to friend nicknames. */
    getNickname(userId: string): string;

    /** @returns Enum value from constants.RelationshipTypes */
    getRelationshipType(userId: string): number;
    isBlockedOrIgnored(userId: string): boolean;
    isBlockedOrIgnoredForMessage(userId: string): boolean;
    isBlocked(userId: string): boolean;
    isBlockedForMessage(userId: string): boolean;
    isFriend(userId: string): boolean;
    isIgnored(userId: string): boolean;
    isIgnoredForMessage(userId: string): boolean;
    isUnfilteredPendingIncoming(userId: string): boolean;
    isSpam(userId): boolean;
    getSince(userId: string): string;
    getSinces(): Record<number, string>;

    getFriendCount(): number;
    getRelationshipCount(): number;
    getOutgoingCount(): number;
    getPendingCount(): number;
    getPendingIgnoredCount(): number;
    getSpamCount(): number;

    getMutableRelationships(): Map<string, number>;
    getVersion(): number;
}
