import { FluxStore, User } from "..";

/** returned by takeSnapshot for persistence */
export interface UserStoreSnapshot {
    /** snapshot format version, currently 1 */
    version: number;
    data: {
        /** contains only the current user */
        users: User[];
    };
}

export class UserStore extends FluxStore {
    /**
     * filters users and optionally sorts results.
     * @param sort if true (default false), sorts alphabetically by username
     */
    filter(filter: (user: User) => boolean, sort?: boolean): User[];
    /**
     * finds user by username and discriminator.
     * for new username system (unique usernames), pass null/undefined as discriminator.
     */
    findByTag(username: string, discriminator?: string | null): User | undefined;
    /** @param action return false to break iteration early */
    forEach(action: (user: User) => boolean | void): void;
    getCurrentUser(): User;
    getUser(userId: string): User;
    /** keyed by user ID */
    getUsers(): Record<string, User>;
    /** increments when users are added/updated/removed */
    getUserStoreVersion(): number;
    /** only includes current user, used for persistence */
    takeSnapshot(): UserStoreSnapshot;
}
