import { FluxStore, User } from "..";

export class UserStore extends FluxStore {
    filter(filter: (user: User) => boolean, sort?: boolean): User[];
    findByTag(username: string, discriminator: string): User | undefined;
    forEach(action: (user: User) => void): void;
    getCurrentUser(): User;
    getUser(userId: string): User | undefined;
    getUsers(): Record<string, User>;
    getUserStoreVersion(): number;
    takeSnapshot(): Record<string, User>;
}
