import { FluxStore, User } from "..";

export class UserStore extends FluxStore {
    filter(filter: (user: User) => boolean, sort?: boolean): Record<string, User>;
    findByTag(username: string, discriminator: string): User;
    forEach(action: (user: User) => void): void;
    getCurrentUser(): User;
    getUser(userId: string): User;
    getUsers(): Record<string, User>;
}
