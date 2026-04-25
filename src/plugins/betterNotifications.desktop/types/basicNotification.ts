/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface BasicNotification {
    notif_type: string;
    notif_user_id: string;
    message_id: string;
    message_type: number;
    channel_id: string;
    channel_type: number;
    guild_id: string;
}
