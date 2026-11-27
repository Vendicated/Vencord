/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface BlockedWebhook {
    name: string,
    webhook: {
        id: string,
        avatar: string | null;
    };
    guildId: string;
}
