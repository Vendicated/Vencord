/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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
export const friendsTrackingKey = () => `friend-notifications-tracking-${UserStore.getCurrentUser()?.id}`;
export const friendsPreviousStatusesKey = () => `friend-notifications-tracking-${UserStore.getCurrentUser()?.id}`;

const openProfile = findByCodeLazy("friendToken", "USER_PROFILE_MODAL_OPEN");

export async function init() {
    const friendsArr = RelationshipStore.getFriendIDs();
    friendsArr.forEach(friend => friends.add(friend));

    const [storeValues, storeValues2]: [FriendNotificationStore, FriendNotificationStatusStore] =
        await Promise.all([
            DataStore.get(friendsTrackingKey()) || new Set(),
            DataStore.get(friendsPreviousStatusesKey()) || new Map(),
        ]);

    storeValues2.forEach((v, k) => trackingStatusText.set(k, v));

    const presenceStoreState: PresenceStoreState = PresenceStore.getState();
    const statuses = presenceStoreState.clientStatuses;

    await Promise.all(Array.from(storeValues).map(async id => {
        const status = statuses[id];
        const s: Status = typeof status === "object" ? Object.values(status)[0] || "offline" : "offline";
        tracked.set(id, s);

        const user = UserStore.getUser(id);
        if (user) {
            const activities = presenceStoreState.activities[id];
            await statusTextHandler(activities, user);
        }
    }));
}

function truncateString(str: string, num: number): string {
    if (str.length <= num) return str;
    let truncated = str.slice(0, num);
    const lastSpaceIndex = truncated.lastIndexOf(" ");
    if (lastSpaceIndex !== -1) truncated = truncated.slice(0, lastSpaceIndex);
    return truncated + "...";
}

async function statusTextHandler(activities: Activity[], user: User) {
    if (!tracked.has(user.id)) return;

    const customStatusActivity = activities?.find(act => act.id === "custom") ?? undefined;

    if (!settings.store.statusTextNotifications) {
        trackingStatusText.set(user.id, customStatusActivity);
        return;
    }

    const lastStatus = trackingStatusText.get(user.id);
    if (!customStatusActivity && !lastStatus) return;

    const prevShort = truncateString(lastStatus?.state ?? "", 15);
    const currentShort = truncateString(customStatusActivity?.state ?? "", 15);
    const displayName = RelationshipStore.getNickname(user.id) ?? user.username;

    if (!lastStatus && customStatusActivity) {
        await notify(`${displayName} set status`, currentShort, user);
    } else if (lastStatus && !customStatusActivity) {
        await notify(`${displayName} deleted status`, prevShort, user);
    } else if (lastStatus && customStatusActivity && lastStatus.state !== customStatusActivity.state) {
        await notify(`${displayName} changed status`, `from "${prevShort}" to "${currentShort}"`, user);
    }

    trackingStatusText.set(user.id, customStatusActivity);
    debounceDataStoreUpdate(friendsPreviousStatusesKey(), trackingStatusText, 5000); // Debounce updates
}

export async function presenceUpdate({ updates }: { updates: Update[]; }) {
    updates.forEach(async ({ user: _user, status, activities }) => {
        if (!_user || typeof _user.id === "undefined") return;

        const user = UserStore.getUser(_user.id) || { id: "", username: "" };
        if (!user.username || !user.id) return;

        const prevStatus = tracked.get(user.id);
        if (prevStatus === undefined) return;

        tracked.set(user.id, status);
        const displayName = RelationshipStore.getNickname(user.id) || user.username;

        if (status === "offline" && settings.store.offlineNotifications) {
            await notify(plugin.name, `${displayName} went offline`, user);
        } else if (prevStatus === "offline" && ["online", "dnd", "idle"].includes(status) && settings.store.onlineNotifications) {
            await notify(plugin.name, `${displayName} came online`, user);
        } else {
            await statusTextHandler(activities, user);
        }
    });
}

async function notify(title: string, body: string, user: User) {
    if (!settings.store.notifications) return;

    const action = settings.store.notificationAction || "open";
    const dmChannelId = ChannelStore.getDMFromUserId(user.id);
    const avatarURL = UserStore.getUser(user.id).getAvatarURL();

    await showNotification({
        title,
        body,
        icon: avatarURL,
        dismissOnClick: action === "dismiss",
        onClick: () => {
            if (action === "open" && dmChannelId) {
                NavigationRouter.transitionTo("/channels/@me/" + dmChannelId);
                setTimeout(window.focus, 200);
            } else if (action === "profile") {
                openProfile({ userId: user.id, guildId: null, channelId: SelectedChannelStore.getChannelId() });
            }
        },
    });
}

function debounceDataStoreUpdate(key: string, value: any, delay: number) {
    clearTimeout((debounceDataStoreUpdate as any).timer);
    (debounceDataStoreUpdate as any).timer = setTimeout(() => {
        DataStore.set(key, value);
    }, delay);
}

export async function writeTrackedToDataStore() {
    const keys = Array.from(tracked.keys());
    const set = new Set(keys);
    await DataStore.set(friendsTrackingKey(), set);
}
