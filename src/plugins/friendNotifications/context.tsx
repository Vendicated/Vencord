/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Menu, RelationshipStore, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

import { UserContextProps } from "./types";
import { tracked, writeTrackedToDataStore } from "./utils";

export async function contextMenuOpen(user: User) {
    const { id: userId } = user;

    // Cannot determine status from user object
    tracked.has(userId) ?
        tracked.delete(userId) :
        tracked.set(userId, null);

    // Persist data
    await writeTrackedToDataStore();
}

export const UserContext: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => () => {
    const { id: userId } = user;
    if (!RelationshipStore.isFriend(userId)) return;
    if (!UserStore.getUser(userId)) return;

    children.splice(1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="friend-notifications"
                label={
                    tracked.has(userId) ?
                        "Disable Friend Notifications" :
                        "Enable Friend Notifications"
                }
                action={() => contextMenuOpen(user)}
            />
        </Menu.MenuGroup>
    ));
};
