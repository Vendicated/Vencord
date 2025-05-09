/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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
