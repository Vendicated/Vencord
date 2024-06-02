/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const STORE_KEY = "vc-ignore-user-store";
export const userIds: string[] = [];

export const removeHiddenUser = (userId: string) => {
    const current = userIds.findIndex(id => id === userId);
    userIds.splice(current, 1);
};
