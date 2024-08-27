/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { SnapshotStore, SnapshotStoreSnapshot } from "../flux/SnapshotStore";
import type { UserRecord } from "../general/UserRecord";
import type { GenericConstructor, Nullish } from "../internal";

export interface UserStoreSnapshotData {
    users: [UserRecord?];
}

export declare class UserStore<
    Constructor extends GenericConstructor = typeof UserStore,
    SnapshotData extends UserStoreSnapshotData = UserStoreSnapshotData
> extends SnapshotStore<Constructor, SnapshotData> {
    constructor();

    static displayName: "UserStore";
    static LATEST_SNAPSHOT_VERSION: number;

    filter<T extends UserRecord>(predicate: (user: UserRecord) => user is T, sort?: boolean | undefined /* = false */): T[];
    filter(predicate: (user: UserRecord) => unknown, sort?: boolean | undefined /* = false */): UserRecord[];
    findByTag(username: string, discriminator?: string | Nullish): UserRecord | undefined;
    /**
     * @param callback The iteratee. Iteration will terminate early if it returns false.
     */
    forEach(callback: (user: UserRecord) => unknown): void;
    /**
     * @returns The UserRecord object for the current user. If the current user has not yet been loaded, undefined is returned.
     */
    getCurrentUser(): UserRecord | undefined;
    getUser(userId?: string | Nullish): UserRecord | undefined;
    getUsers(): { [userId: string]: UserRecord; };
    getUserStoreVersion(): number;
    handleLoadCache(cache: {
        /** @todo */
        initialGuildChannels: readonly any[];
        /** @todo */
        privateChannels: readonly any[];
        /** @todo */
        users: readonly any[] | Nullish;
    }): void;
    initialize(): void;
    takeSnapshot(): SnapshotStoreSnapshot<SnapshotData>;
}
