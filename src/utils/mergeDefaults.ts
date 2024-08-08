/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Recursively merges defaults into an object and returns the same object
 * @param obj Object
 * @param defaults Defaults
 * @returns obj
 */
export function mergeDefaults<T>(obj: T, defaults: T): T {
    for (const key in defaults) {
        const v = defaults[key];
        // This cannot be replaced with a call to 'isObject' from '@utils/misc'.
        // '@utils/misc' will error when imported in the main process.
        if (typeof v === "object" && v !== null && !Array.isArray(v)) {
            obj[key] ??= {} as any;
            mergeDefaults(obj[key], v);
        } else {
            obj[key] ??= v;
        }
    }
    return obj;
}
