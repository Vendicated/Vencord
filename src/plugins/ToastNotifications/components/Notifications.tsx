/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";
import { createRoot, React, RelationshipStore } from "@webpack/common";
import { User } from "discord-types/general";
import type { JSX } from "react";
import type { Root } from "react-dom/client";

import { settings as PluginSettings } from "../index";
import { NotificationData } from "../types";
import NotificationComponent from "./NotificationComponent";

const UserUtils = findByPropsLazy("getGlobalName");

let NotificationQueue: JSX.Element[] = [];
let notificationID = 0;
let RootContainer: Root;

/**
 * Gets the root container for the notifications, creating it if it doesn't exist.
 * @returns {Root} The root DOM container.
 */
function getNotificationContainer() {
    if (!RootContainer) {
        const container = document.createElement("div");
        container.id = "toastnotifications-container";
        document.body.append(container);
        RootContainer = createRoot(container);
    }

    return RootContainer;
}

/**
 * Helper function to get a user's nickname if they have one, otherwise their username.
 *
 * @param   {User}      user    The user to get the name of.
 * @returns {String}            The name of the user.
 */
export function getUserDisplayName(user: User): string {
    return RelationshipStore.getNickname(user.id) ?? UserUtils.getName(user);
}

/**
 * Renders the NotificationComponent to the DOM.
 * @param {NotificationData} notification The notification data.
 */
export async function showNotification(notification: NotificationData) {
    const root = getNotificationContainer();
    const thisNotificationID = notificationID++;

    return new Promise<void>(resolve => {
        const ToastNotification = (
            <NotificationComponent
                key={thisNotificationID.toString()}
                index={NotificationQueue.length}
                {...notification}
                onClose={() => {
                    // Remove this notification from the queue.
                    NotificationQueue = NotificationQueue.filter(n => n.key !== thisNotificationID.toString());
                    notification.onClose?.(); // Trigger the onClose callback if it exists.
                    console.debug(`[DEBUG] [ToastNotifications] Removed #${thisNotificationID} from queue.`);

                    // Re-render remaining notifications with new reversed indices.
                    root.render(
                        <>
                            {NotificationQueue.map((notification, index) => {
                                const reversedIndex = (NotificationQueue.length - 1) - index;
                                return React.cloneElement(notification, { index: reversedIndex });
                            })}
                        </>
                    );

                    resolve();
                }}
            />
        );

        // Add this notification to the queue.
        NotificationQueue.push(ToastNotification);
        console.debug(`[DEBUG] [ToastNotifications] Added #${thisNotificationID} to queue.`);

        // Limit the number of notifications to the configured maximum.
        if (NotificationQueue.length > PluginSettings.store.maxNotifications) NotificationQueue.shift();

        // Render the notifications.
        root.render(
            <>
                {NotificationQueue.map((notification, index) => {
                    const reversedIndex = (NotificationQueue.length - 1) - index;
                    return React.cloneElement(notification, { index: reversedIndex });
                })}
            </>
        );
    });
}
