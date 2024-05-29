/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { UserRecord } from "../general/UserRecord";
import type { GenericConstructor, Nullish } from "../internal";
import type { FluxSnapshot, FluxSnapshotStore } from "./abstract/FluxSnapshotStore";

export interface UserStoreSnapshotData {
    users: [UserRecord] | [];
}

export type UserStoreAction = ExtractAction<FluxAction, "AUDIT_LOG_FETCH_NEXT_PAGE_SUCCESS" | "AUDIT_LOG_FETCH_SUCCESS" | "CACHE_LOADED" | "CHANNEL_CREATE" | "CHANNEL_RECIPIENT_ADD" | "CHANNEL_RECIPIENT_REMOVE" | "CHANNEL_UPDATES" | "CONNECTION_OPEN" | "CONNECTION_OPEN_SUPPLEMENTAL" | "CURRENT_USER_UPDATE" | "FAMILY_CENTER_INITIAL_LOAD" | "FAMILY_CENTER_LINKED_USERS_FETCH_SUCCESS" | "FAMILY_CENTER_REQUEST_LINK_SUCCESS" | "FAMILY_CENTER_TEEN_ACTIVITY_FETCH_SUCCESS" | "FAMILY_CENTER_TEEN_ACTIVITY_MORE_FETCH_SUCCESS" | "FETCH_PRIVATE_CHANNEL_INTEGRATIONS_SUCCESS" | "FRIEND_SUGGESTION_CREATE" | "GIFT_CODE_RESOLVE_SUCCESS" | "GUILD_APPLIED_BOOSTS_FETCH_SUCCESS" | "GUILD_BAN_ADD" | "GUILD_BAN_REMOVE" | "GUILD_CREATE" | "GUILD_FEED_FETCH_SUCCESS" | "GUILD_JOIN_REQUEST_CREATE" | "GUILD_JOIN_REQUEST_UPDATE" | "GUILD_MEMBERS_CHUNK_BATCH" | "GUILD_MEMBER_ADD" | "GUILD_MEMBER_LIST_UPDATE" | "GUILD_MEMBER_UPDATE" | "GUILD_SCHEDULED_EVENT_USERS_FETCH_SUCCESS" | "GUILD_SETTINGS_LOADED_BANS" | "GUILD_SETTINGS_LOADED_BANS_BATCH" | "LOAD_ARCHIVED_THREADS_SUCCESS" | "LOAD_FORUM_POSTS" | "LOAD_FRIEND_SUGGESTIONS_SUCCESS" | "LOAD_MESSAGES_AROUND_SUCCESS" | "LOAD_MESSAGES_SUCCESS" | "LOAD_MESSAGE_REQUESTS_SUPPLEMENTAL_DATA_SUCCESS" | "LOAD_NOTIFICATION_CENTER_ITEMS_SUCCESS" | "LOAD_PINNED_MESSAGES_SUCCESS" | "LOAD_RECENT_MENTIONS_SUCCESS" | "LOAD_RELATIONSHIPS_SUCCESS" | "LOAD_THREADS_SUCCESS" | "LOCAL_MESSAGES_LOADED" | "MEMBER_SAFETY_GUILD_MEMBER_SEARCH_SUCCESS" | "MESSAGE_CREATE" | "MESSAGE_UPDATE" | "MOD_VIEW_SEARCH_FINISH" | "NOTIFICATION_CENTER_ITEM_CREATE" | "OVERLAY_INITIALIZE" | "PASSIVE_UPDATE_V2" | "PRESENCE_UPDATES" | "PRIVATE_CHANNEL_INTEGRATION_CREATE" | "PRIVATE_CHANNEL_INTEGRATION_UPDATE" | "RELATIONSHIP_ADD" | "SEARCH_FINISH" | "THREAD_LIST_SYNC" | "THREAD_MEMBERS_UPDATE" | "THREAD_MEMBER_LIST_UPDATE" | "UPDATE_CLIENT_PREMIUM_TYPE" | "USER_UPDATE">;

export class UserStore<
    Constructor extends GenericConstructor = typeof UserStore
> extends FluxSnapshotStore<Constructor, UserStoreSnapshotData, UserStoreAction> {
    constructor();

    static displayName: "UserStore";
    static LATEST_SNAPSHOT_VERSION: number;

    filter<T extends UserRecord>(predicate: (user: UserRecord) => user is T, sort?: boolean | undefined): T[];
    filter(predicate: (user: UserRecord) => unknown, sort?: boolean | undefined): UserRecord[];
    findByTag(username: string, discriminator?: string | Nullish): UserRecord | undefined;
    forEach(callback: (user: UserRecord) => boolean | undefined): void;
    /**
     * @returns The UserRecord object for the current user. If no USER_UPDATE action has been dispatched for the current user, undefined is returned.
     */
    getCurrentUser(): UserRecord | undefined;
    getUser(userId?: string | Nullish): UserRecord | undefined;
    getUsers(): { [userId: string]: UserRecord; };
    getUserStoreVersion(): number;
    handleLoadCache(cache: {
        initialGuildChannels: any[]; // TEMP
        privateChannels: any[]; // TEMP
        users: any[] | Nullish; // TEMP
    }): void;
    takeSnapshot(): FluxSnapshot<UserStoreSnapshotData>;
}
