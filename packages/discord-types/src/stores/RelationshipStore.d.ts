import { FluxStore } from "..";
import { Message, MessageJSON } from "../common/messages";
import { RelationshipType } from "../../enums";

export class RelationshipStore extends FluxStore {
    getBlockedIDs(): string[];
    getBlockedOrIgnoredIDs(): string[];
    getFriendCount(): number;
    getFriendIDs(): string[];
    getIgnoredIDs(): string[];

    getMutableRelationships(): Map<string, RelationshipType>;
    getNickname(userId: string): string;
    getOriginApplicationId(userId: string): string | undefined;
    getOutgoingCount(): number;
    getPendingCount(): number;
    getPendingIgnoredCount(): number;
    getRelationshipCount(): number;

    /** @returns Enum value from constants.RelationshipTypes */
    getRelationshipType(userId: string): RelationshipType;
    getSince(userId: string): string;
    getSinces(): Record<string, string>;
    getSpamCount(): number;
    getVersion(): number;

    isBlocked(userId: string): boolean;
    isBlockedForMessage(message: Message | MessageJSON): boolean;

    /**
     * @see {@link isBlocked}
     * @see {@link isIgnored}
     */
    isBlockedOrIgnored(userId: string): boolean;
    isBlockedOrIgnoredForMessage(message: Message | MessageJSON): boolean;

    isFriend(userId: string): boolean;
    isIgnored(userId: string): boolean;
    isIgnoredForMessage(message: Message | MessageJSON): boolean;
    isSpam(userId: string): boolean;
    isStranger(userId: string): boolean;
    isUnfilteredPendingIncoming(userId: string): boolean;
}
