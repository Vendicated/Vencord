/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Store } from "../flux/Store";
import type { MessageRecord } from "../general/messages/MessageRecord";
import type { Nullish } from "../internal";

export declare class RelationshipStore extends Store {
    static displayName: "RelationshipStore";

    /** @todo May eventually be renamed to `getBlockedIds`. */
    getBlockedIDs(): string[];
    getFriendCount(): number;
    /** @todo May eventually be renamed to `getFriendIds`. */
    getFriendIDs(): string[];
    getNickname(userId: string): string | undefined;
    getOutgoingCount(): number;
    getPendingCount(): number;
    getRelationshipCount(): number;
    getRelationships(): { [userId: string]: RelationshipType; };
    getRelationshipType(userId: string): RelationshipType;
    getSince(userId: string): string | undefined;
    getSinces(): { [userId: string]: string; };
    getSpamCount(): number;
    initialize(): void;
    isBlocked(userId?: string | Nullish): boolean;
    isBlockedForMessage(message?: MessageRecord | {
        author?: { id: string; } | Nullish;
        interaction_metadata?: { user: { id?: string | Nullish; } | Nullish; } | Nullish;
    }): boolean;
    isFriend(userId?: string | Nullish): boolean;
    isSpam(userId: string): boolean;
}

// Original name: RelationshipTypes
export enum RelationshipType {
    NONE = 0,
    FRIEND = 1,
    BLOCKED = 2,
    PENDING_INCOMING = 3,
    PENDING_OUTGOING = 4,
    IMPLICIT = 5,
    SUGGESTION = 6,
}
