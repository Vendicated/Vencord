
import * as DataStore from "@api/DataStore";
import { UserStore } from "@webpack/common";

export interface User {
    id: string;
    profilepic: string;
}

const CATEGORY_BASE_KEY = "FriendPFP";

export let Users: User[] = [];

export async function saveUsers(users: Category[]) {
    const { id } = UserStore.getCurrentUser();
    await DataStore.set(CATEGORY_BASE_KEY + id, users);
}

export async function init() {
    const { id } = UserStore.getCurrentUser();

    Users = await DataStore.get<User[]>(CATEGORY_BASE_KEY + id) ?? [];
}

export function getUserPFP(id: string) {
    const user = Users.find(c => c.id === id);
    if (user) {

        return user.profilepic;
    } else {

        return null; // or handle the case where the user is not found
    }
}

export function getUser(id: string) {
    return Users.find(c => c.id === id);
}

export function hasUser(id: string) {
    console.log(Users);
    console.log(id);
    return Users.some(c => c.id === id);

}

export async function removeUser(id: string) {
    const user = Users.find(c => c.id === id);
    if (!user) return;

    Users = Users.filter(c => c.id !== id);
    await saveUsers(Users);
}

export async function addUser(user: User) {
    if (getUser(user.id)) {
        removeUser(user.id)
    }
    Users.push(user);
    saveUsers(Users);

}
