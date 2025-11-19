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

import { settings as PluginSettings } from "@equicordplugins/toastNotifications/index";
import { createRoot, React } from "@webpack/common";
import type { JSX, ReactNode } from "react";
import type { Root } from "react-dom/client";

import NotificationComponent from "./NotificationComponent";

let NotificationQueue: JSX.Element[] = [];
let notificationID = 0;
let RootContainer: Root;

function getNotificationContainer() {
    if (!RootContainer) {
        const container = document.createElement("div");
        container.id = "toastnotifications-container";
        document.body.append(container);
        RootContainer = createRoot(container);
    }

    return RootContainer;
}

export interface NotificationData {
    title: string; // Title to display in the notification.
    body: string; // Notification body text.
    richBody?: ReactNode; // Same as body, though a rich ReactNode to be rendered within the notification.
    icon?: string; // Avatar image of the message author or source.
    image?: string; // Large image to display in the notification for attachments.
    permanent?: boolean; // Whether or not the notification should be permanent or timeout.
    dismissOnClick?: boolean; // Whether or not the notification should be dismissed when clicked.
    attachments: number;
    onClick?(): void;
    onClose?(): void;
}

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
                    console.log(`[DEBUG] [ToastNotifications] Removed #${thisNotificationID} from queue.`);

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
        console.log(`[DEBUG] [ToastNotifications] Added #${thisNotificationID} to queue.`);

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
