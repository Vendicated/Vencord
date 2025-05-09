/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { ReactNode } from "react";

/**
 * Discord message component types.
 */
export const enum MessageTypes {
    CHANNEL_RECIPIENT_ADD = 1,
    CHANNEL_RECIPIENT_REMOVE = 2,
    CALL = 3,
    CHANNEL_NAME_CHANGE = 4,
    CHANNEL_ICON_CHANGE = 5,
    CHANNEL_PINNED_MESSAGE = 6,
}

/**
 * Types of mentions that appear in a ToastNotification message.
 */
export enum MentionType {
    USER = "@",
    CHANNEL = "#",
    ROLE = "&"
}

export interface NotificationData {
    title: string; // Title to display in the notification.
    body: string; // Notification body text.
    richBody?: ReactNode; // Same as body, though a rich ReactNode to be rendered within the notification.
    icon?: string; // Avatar image of the message author or source.
    image?: string; // Large image to display in the notification for attachments.
    permanent?: boolean; // Whether or not the notification should be permanent or timeout.
    dismissOnClick?: boolean; // Whether or not the notification should be dismissed when clicked.
    onClick?(): void;
    onClose?(): void;
}
