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

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Menu, PresenceStore, RelationshipStore, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

import type { Platform, Status, UserContextProps } from "./types";
import { tracked, writeTrackedToDataStore } from "./utils";

export async function contextMenuOpen(user: User) {
    const { id: userId } = user;
    const statuses = PresenceStore.getState().clientStatuses as Record<string, Record<Platform, Status>>;
    const status = statuses[userId];
    const s: Status = typeof status === "object" ? Object.values(status)[0] || "offline" : "offline";

    tracked.has(userId) ?
        tracked.delete(userId) :
        tracked.set(userId, s);

    // Persist data
    await writeTrackedToDataStore();
}

export const UserContext: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => () => {
    const { id: userId } = user;
    if (!RelationshipStore.isFriend(userId)) return;
    if (!UserStore.getUser(userId)) return;

    const group = findGroupChildrenByChildId("block", children);

    if (!group) return;

    group.push(
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
    );
};
