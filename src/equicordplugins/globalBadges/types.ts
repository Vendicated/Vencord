/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type CustomBadge = {
    tooltip: string;
    badge: string;
    custom?: boolean;
};

export interface BadgeCache {
    badges: { [mod: string]: CustomBadge[]; };
    expires: number;
}
