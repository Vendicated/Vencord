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

import { DataStore } from "@api/index";
import { showNotification } from "@api/Notifications";
import { PresenceStore, RelationshipStore, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

import plugin from "./index";
import settings from "./settings";
import type { FriendNotificationStore, Platform, Status } from "./types";

export const tracked = new Map<string, Status | null>();
export const friends = new Set<string>();
export const trackingKey = () => `friend-notifications-tracking-${UserStore.getCurrentUser().id}`;

export async function init() {
    const friendsArr = RelationshipStore.getFriendIDs();
    for (const friend of friendsArr) {
        friends.add(friend);
    }

    const storeValues: FriendNotificationStore = await DataStore.get(trackingKey()) || new Set();
    const statuses = PresenceStore.getState().clientStatuses as Record<string, Record<Platform, Status>>;
    Array.from(storeValues).forEach(id => {
        const status = statuses[id];
        const s: Status = typeof status === "object" ? Object.values(status)[0] || "offline" : "offline";

        tracked.set(id, s);
    });
}

function getAvatarURL(id: string, avatar: string) {
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.webp?size=80`;
}

export async function presenceUpdate({ updates }: { updates: { user: User; status: Status; guildId: string; }[]; }) {
    // If they come online, then notify
    // If they go offline, then notify
    for (const { user, status } of updates) {
        if (settings.store.debug) {
            if (!user.username) {
                const guildUser = UserStore.getUser(user.id);
                // User friend
                console.table({
                    time: `[${new Date()}]`,
                    username: guildUser.username,
                    status: status,
                    id: user.id
                });
            } else {
                // User friend
                console.table({
                    time: `[${new Date()}]`,
                    username: user.username,
                    status: status,
                    id: user.id
                });
            }
        }
        const { id, username } = user;
        if (!username || !id) continue;
        // Skip non-friends
        const prevStatus = tracked.get(id);
        // Equals explicitly undefined (only true of key isn't defined)
        if (prevStatus === undefined) continue;
        const avatarURL = UserStore.getUser(id).getAvatarURL();

        // Set new status
        tracked.set(id, status);

        /*
         * Figure out what happened.
         * Case 1. Current status is offline
         *   - Friend went offline
         * Case 2. Previous status is not defined, and currently online (or dnd, or idle)
         *   - Friend came online
         *   - Or we couldn't determine previous status, and they changed their status which leaves
         *   Room for error
         * Case 3. Previous status was offline, and currently online (or dnd, or idle)
         *   - Friend came online
         * Case 4. None of the conditions are met
         *   - Friend changed their status while online
         */
        if (
            settings.store.offlineNotifications &&
            status === "offline"
        ) {
            notify(`${username} went offline`, avatarURL);
        } else if (
            settings.store.onlineNotifications &&
            ((prevStatus === null || prevStatus === "offline") &&
                ["online", "dnd", "idle"].includes(status))
        ) {
            notify(`${username} came online`, avatarURL);
        }
    }
}

export function notify(text: string, icon?: string) {
    if (!settings.store.notifications) return;

    showNotification({
        title: plugin.name,
        body: text,
        icon,
        dismissOnClick: true,
    });
}

export async function writeTrackedToDataStore() {
    const keys = Array.from(tracked.keys());
    const set = new Set(keys);
    await DataStore.set(trackingKey(), set);
}
