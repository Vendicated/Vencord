/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { GuildMemberProfile } from "../general/GuildMemberProfile";
import type { GuildRecord } from "../general/GuildRecord";
import type { UserProfile } from "../general/UserProfile";
import type { UserRecord } from "../general/UserRecord";
import type { GenericConstructor, Nullish } from "../internal";
import type { FluxSnapshot, FluxSnapshotStore } from "./abstract/FluxSnapshotStore";

export interface UserProfileStoreSnapshotData {
    profile: UserProfile | undefined;
    userId: string;
}

export type UserProfileStoreAction = ExtractAction<FluxAction, "CACHE_LOADED_LAZY" | "GUILD_DELETE" | "GUILD_JOIN" | "GUILD_MEMBER_ADD" | "GUILD_MEMBER_REMOVE" | "GUILD_MEMBER_UPDATE" | "LOGOUT" | "MUTUAL_FRIENDS_FETCH_FAILURE" | "MUTUAL_FRIENDS_FETCH_START" | "MUTUAL_FRIENDS_FETCH_SUCCESS" | "USER_PROFILE_ACCESSIBILITY_TOOLTIP_VIEWED" | "USER_PROFILE_FETCH_FAILURE" | "USER_PROFILE_FETCH_START" | "USER_PROFILE_FETCH_SUCCESS" | "USER_PROFILE_UPDATE_FAILURE" | "USER_PROFILE_UPDATE_START" | "USER_PROFILE_UPDATE_SUCCESS" | "USER_UPDATE">;

export class UserProfileStore<
    Constructor extends GenericConstructor = typeof UserProfileStore
> extends FluxSnapshotStore<Constructor, UserProfileStoreSnapshotData, UserProfileStoreAction> {
    constructor();

    static displayName: "UserProfileStore";
    static LATEST_SNAPSHOT_VERSION: number;

    getGuildMemberProfile(userId: string, guildId?: string | Nullish): GuildMemberProfile | Nullish;
    getIsAccessibilityTooltipViewed(): boolean;
    getMutualFriends(userId: string): {
        key: string; // userId
        status: StatusType;
        user: UserRecord;
    }[] | undefined;
    getMutualFriendsCount(userId: string): number | undefined;
    getMutualGuilds(userId: string): {
        guild: GuildRecord;
        nick: string | null;
    }[] | undefined;
    getUserProfile<FetchFailed extends boolean = boolean>(userId: string): UserProfile<FetchFailed> | undefined;
    isFetchingFriends(userId: string): boolean;
    isFetchingProfile(userId: string): boolean;
    get isSubmitting(): boolean;
    takeSnapshot(): FluxSnapshot<UserProfileStoreSnapshotData>;

    loadCache: () => void;
}

// Original name: StatusTypes
export const enum StatusType {
    DND = "dnd",
    IDLE = "idle",
    INVISIBLE = "invisible",
    OFFLINE = "offline",
    ONLINE = "online",
    STREAMING = "streaming",
    UNKNOWN = "unknown",
}
