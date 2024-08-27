/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { SnapshotStore, SnapshotStoreSnapshot } from "../flux/SnapshotStore";
import type { GuildMemberProfile } from "../general/GuildMemberProfile";
import type { GuildRecord } from "../general/GuildRecord";
import type { UserProfile } from "../general/UserProfile";
import type { UserRecord } from "../general/UserRecord";
import type { GenericConstructor, Nullish } from "../internal";
import type { StatusType } from "./PresenceStore";

export interface UserProfileStoreSnapshotData {
    profile: UserProfile | undefined;
    userId: string;
}

export declare class UserProfileStore<
    Constructor extends GenericConstructor = typeof UserProfileStore,
    SnapshotData extends UserProfileStoreSnapshotData = UserProfileStoreSnapshotData
> extends SnapshotStore<Constructor, SnapshotData> {
    constructor();

    static displayName: "UserProfileStore";
    static LATEST_SNAPSHOT_VERSION: number;

    getGuildMemberProfile(userId: string, guildId?: string | Nullish): GuildMemberProfile | Nullish;
    getMutualFriends(userId: string): {
        /** The ID of the user. */
        key: string;
        status: StatusType;
        user: UserRecord;
    }[] | undefined;
    getMutualFriendsCount(userId: string): number | undefined;
    getMutualGuilds(userId: string): {
        guild: GuildRecord;
        nick: string | null;
    }[] | undefined;
    getUserProfile<FetchFailed extends boolean = boolean>(userId: string): UserProfile<FetchFailed> | undefined;
    initialize(): void;
    isFetchingFriends(userId: string): boolean;
    isFetchingProfile(userId: string): boolean;
    get isSubmitting(): boolean;
    takeSnapshot(): SnapshotStoreSnapshot<SnapshotData>;

    loadCache: () => void;
}
