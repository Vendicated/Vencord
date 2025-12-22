import { FluxStore } from "..";
import { RelationshipType } from "../../enums";

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
