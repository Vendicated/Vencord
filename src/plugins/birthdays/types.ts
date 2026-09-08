/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Birthday {
    day: number; 
    month: number; 
    year?: number;
}

export interface UpcomingBirthday {
    userId: string;
    birthday: Birthday;
    days: number;
}
