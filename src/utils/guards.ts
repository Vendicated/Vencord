/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function isTruthy<T>(item: T): item is Exclude<T, 0 | "" | false | null | undefined> {
    return Boolean(item);
}

export function isNonNullish<T>(item: T): item is Exclude<T, null | undefined> {
    return item != null;
}
