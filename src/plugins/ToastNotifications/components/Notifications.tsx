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
