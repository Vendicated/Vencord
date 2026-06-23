/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UserStore } from "@webpack/common/stores";

import type { Gif } from "./data";

export function makeId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function getDataKey(): string {
    return `BetterGifCategories_${UserStore.getCurrentUser().id}`;
}

export function gifKey(gif: Gif): string {
    return gif.url || gif.src;
}
