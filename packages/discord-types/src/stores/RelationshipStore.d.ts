import { FluxStore } from "..";

export class RelationshipStore extends FluxStore {
    getFriendIDs(): string[];
    getIgnoredIDs(): string[];
    getBlockedIDs(): string[];

    getPendingCount(): number;
    getRelationshipCount(): number;

    /** Related to friend nicknames. */
    getNickname(userId: string): string;
    /** @returns Enum value from constants.RelationshipTypes */
    getRelationshipType(userId: string): number;
    isFriend(userId: string): boolean;
    isBlocked(userId: string): boolean;
    isIgnored(userId: string): boolean;
    /**
     * @see {@link isBlocked}
     * @see {@link isIgnored}
     */
    isBlockedOrIgnored(userId: string): boolean;
    getSince(userId: string): string;

    getMutableRelationships(): Map<string, number>;
}
