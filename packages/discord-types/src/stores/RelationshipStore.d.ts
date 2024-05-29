/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { FluxStore } from "./abstract/FluxStore";

export type RelationshipStoreAction = ExtractAction<FluxAction, "CONNECTION_OPEN" | "OVERLAY_INITIALIZE" | "RELATIONSHIP_ADD" | "RELATIONSHIP_PENDING_INCOMING_REMOVED" | "RELATIONSHIP_REMOVE" | "RELATIONSHIP_UPDATE">;

export class RelationshipStore<Action extends FluxAction = RelationshipStoreAction> extends FluxStore<Action> {
    static displayName: "RelationshipStore";

    getFriendCount(): number;
    getFriendIDs(): string[];
    getNickname(userId: string): string | undefined;
    getOutgoingCount(): number;
    getPendingCount(): number;
    getRelationshipCount(): number;
    getRelationships(): { [userId: string]: RelationshipType; };
    getRelationshipType(userId: string): RelationshipType;
    getSince(userId: string): string | undefined;
    getSinces(): { [userId: string]: string; };
    initialize(): void;
    isBlocked(userId: string): boolean;
    isFriend(userId: string): boolean;
}

// Original name: RelationshipTypes
export const enum RelationshipType {
    NONE = 0,
    FRIEND = 1,
    BLOCKED = 2,
    PENDING_INCOMING = 3,
    PENDING_OUTGOING = 4,
    IMPLICIT = 5,
    SUGGESTION = 6,
}
