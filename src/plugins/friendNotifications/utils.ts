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
import { findByCodeLazy } from "@webpack";
import {
    ChannelStore,
    NavigationRouter,
    PresenceStore,
    RelationshipStore,
    SelectedChannelStore,
    UserStore,
} from "@webpack/common";
import { User } from "discord-types/general";

import plugin from "./index";
import settings from "./settings";
import type { Activity, FriendNotificationStatusStore, FriendNotificationStore, PresenceStoreState, Status, Update } from "./types";

export const tracked = new Map<string, Status>();
export const trackingStatusText = new Map<string, Activity | undefined>();
export const friends = new Set<string>();
export const friendsTrackingKey = () => `friend-notifications-tracking-${UserStore.getCurrentUser().id}`;
export const friendsPreviousStatusesKey = () => `friend-notifications-tracking-${UserStore.getCurrentUser().id}`;

const openProfile = findByCodeLazy("friendToken", "USER_PROFILE_MODAL_OPEN");

/**
 * FIXME visual glitch with long custom status text
 */

export async function init() {
    const friendsArr = RelationshipStore.getFriendIDs();
    for (const friend of friendsArr) {
        friends.add(friend);
    }

    const storeValues: FriendNotificationStore = await DataStore.get(friendsTrackingKey()) || new Set();
    const storeValues2: FriendNotificationStatusStore = await DataStore.get(friendsPreviousStatusesKey()) || new Map();

    for (const [k, v] of Array.from(storeValues2)) {
        trackingStatusText.set(k, v);
    }

    const presenceStoreState: PresenceStoreState = PresenceStore.getState();
    const statuses = presenceStoreState.clientStatuses;

    const storeValuesArray = Array.from(storeValues);
    storeValuesArray.forEach(async (tmp, i) => {
        // Typescript is so much fun (I have no idea how to destructure
        // an array and give each element the correct type)
        const id = tmp[0] as string;
        const activities = tmp[1] as unknown as Activity[];

        const status = statuses[id];
        const s: Status = typeof status === "object" ? Object.values(status)[0] || "offline" : "offline";

        tracked.set(id, s);

        const user = UserStore.getUser(id);
        await statusTextHandler(presenceStoreState.activities[id], user);
    });
}

async function statusTextHandler(activities: Activity[], user: User) {
    const { id, username } = user;

    // Exit early if user isn't in the settings list
    if (!tracked.has(id)) return;

    // Find user's custom status activity
    const customStatusActivity = activities.find((act: Activity) =>
        act.id === "custom"
    );

    // If custom status notifications are off, track changes and move on
    if (!settings.store.statusTextNotifications) {
        trackingStatusText.set(id, customStatusActivity);
        return;
    }

    // Check activities compared to last
    const lastStatus = trackingStatusText.get(id);

    if (!customStatusActivity && !lastStatus) return;

    /**
      * Case 1. User set their status to something
      * Case 2. User's status was bye-bye'd (or it expired)
      * Case 3. User changed their status
      */
    if (!lastStatus && customStatusActivity) {
        await notify(`${username} set status text to "${customStatusActivity.state}"`, user);
    } else if (lastStatus && !customStatusActivity) {
        await notify(`${username}'s status text was deleted "${lastStatus.state}"`, user);
    } else if (lastStatus && customStatusActivity && lastStatus.state !== customStatusActivity.state) {
        await notify(`${username} changed status text, previously: "${lastStatus.state}," currently: "${customStatusActivity.state}"`, user);
    }

    // Update values
    trackingStatusText.set(id, customStatusActivity);
    await DataStore.set(friendsPreviousStatusesKey(), trackingStatusText);
}

export async function presenceUpdate({ updates }: { updates: Update[]; }) {
    // If they come online, then notify
    // If they go offline, then notify
    for (const { user: _user, status, activities } of updates) {
        if (settings.store.debug) {
            if (!_user.username) {
                const guildUser = UserStore.getUser(_user.id);
                // User friend
                console.table({
                    time: `[${new Date()}]`,
                    username: guildUser.username,
                    status: status,
                    id: _user.id
                });
            } else {
                // User friend
                console.table({
                    time: `[${new Date()}]`,
                    username: _user.username,
                    status: status,
                    id: _user.id
                });
            }
        }

        // Interestingly at runtime, username can be undefined
        const { id } = _user;

        const user: User = typeof _user.username === undefined ?
            UserStore.getUser(id) :
            _user;

        const { username } = user;

        if (!username || !id) continue;
        // Skip non-friends
        const prevStatus = tracked.get(id);
        // Equals explicitly undefined (only true of key isn't defined)
        if (prevStatus === undefined) continue;

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
         *   - Or they changed their custom status text
         */
        if (status === "offline") {
            if (!settings.store.offlineNotifications) continue;
            await notify(`${username} went offline`, user);
        } else if (
            ((prevStatus === null || prevStatus === "offline") &&
                ["online", "dnd", "idle"].includes(status))
        ) {
            if (!settings.store.onlineNotifications) continue;
            await notify(`${username} came online`, user);
        } else {
            await statusTextHandler(activities, user);
        }
    }
}

export async function notify(text: string, user: User) {
    if (!settings.store.notifications) return;

    // Set to the default action in case
    const action = settings.store.notificationAction || "open";
    const dmChannelId = ChannelStore.getDMFromUserId(user.id);
    const avatarURL = UserStore.getUser(user.id).getAvatarURL();

    await showNotification({
        title: plugin.name,
        body: text,
        icon: avatarURL,
        dismissOnClick: action === "dismiss",
        onClick: () => {
            if (action === "open") {
                if (!dmChannelId) return;
                window.focus();
                const link = "/channels/@me/" + dmChannelId;
                NavigationRouter.transitionTo(link);
            } else if (action === "profile") {
                openProfile({
                    userId: user.id,
                    guildId: null,
                    channelId: SelectedChannelStore.getChannelId(),
                });
            }
        }
    });
}

export async function writeTrackedToDataStore() {
    const keys = Array.from(tracked.keys());
    const set = new Set(keys);
    await DataStore.set(friendsTrackingKey(), set);
}
