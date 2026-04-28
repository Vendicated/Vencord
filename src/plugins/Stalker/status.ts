/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { ChannelStore, NavigationRouter, PresenceStore, UserStore } from "@webpack/common";

import { logStalkerEvent, settings } from ".";
import { getTargets } from "./shared";

let lastStatuses: Statuses = {};

type Statuses = { [id: string]: string; };

export const init = () => {
    // Initialize immediately to avoid "just joined" false positives
    const currentStatuses = PresenceStore.getState()?.statuses;
    if (currentStatuses) {
        lastStatuses = Object.assign({}, currentStatuses);
    }
    PresenceStore.addChangeListener(statusChange);
};

export const deinit = () => {
    PresenceStore.removeChangeListener(statusChange);
    lastStatuses = {};
};

export const statusChange = () => {
    const rawNewStatuses: Statuses = PresenceStore.getState()?.statuses || {};
    const newStatuses: Statuses = Object.assign({}, rawNewStatuses);

    // Ensure targets have an entry even if offline
    for (const id of getTargets()) {
        if (!newStatuses[id]) newStatuses[id] = "offline";
    }

    // If first run, just sync and exit
    if (Object.keys(lastStatuses).length === 0) {
        lastStatuses = Object.assign({}, newStatuses);
        return;
    }

    for (const [id, status] of Object.entries(newStatuses)) {
        const isStalking = getTargets().includes(id);
        const lastStatus = lastStatuses[id] ?? "offline";

        if (isStalking && lastStatus !== status) {
            let shouldNotify = false;
            if (lastStatus === "offline" && settings.store.notifyGoOnline) shouldNotify = true;
            if (status === "dnd" && settings.store.notifyDnd) shouldNotify = true;
            if (status === "idle" && settings.store.notifyIdle) shouldNotify = true;
            if (status === "online" && settings.store.notifyOnline) shouldNotify = true;
            if (status === "offline" && settings.store.notifyOffline) shouldNotify = true;

            if (shouldNotify) {
                const user = UserStore.getUser(id);
                if (!user) continue; // User might not be cached

                const color = user.accentColor ? `#${user.accentColor.toString(16)}` : undefined;

                showNotification({
                    title: "Stalker",
                    body: `${user.username} is now ${status === "dnd" ? "in " : ""}${status ?? "offline"}`,
                    color,
                    icon: user.getAvatarURL(),
                    onClick: () => {
                        const dmChannelId = ChannelStore.getDMFromUserId(user.id);
                        if (dmChannelId) {
                            NavigationRouter.transitionTo(`/channels/@me/${dmChannelId}`);
                        }
                    },
                });

                logStalkerEvent({
                    timestamp: new Date().toISOString(),
                    userId: user.id,
                    username: user.username,
                    action: "status_change",
                    details: `Status changed from ${lastStatus} to ${status}`
                });
            }
        }
    }

    lastStatuses = Object.assign({}, newStatuses);
};
