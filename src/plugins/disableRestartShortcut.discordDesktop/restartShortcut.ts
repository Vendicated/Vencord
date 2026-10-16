/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function parseRestartShortcut(value: unknown) {
    if (typeof value !== "string") return null;
    const parts = value.trim().toUpperCase().split("+").map(part => part.trim());
    const key = parts.pop();
    const modifiers = new Set(parts);
    if (!key || !/^(?:[A-Z0-9]|F(?:[1-9]|1[0-2]))$/.test(key)
        || (!modifiers.has("CTRL") && !modifiers.has("ALT")) || modifiers.size !== parts.length
        || parts.some(part => part !== "CTRL" && part !== "ALT" && part !== "SHIFT")
        || (key === "R" && modifiers.has("CTRL") && modifiers.size === 1)) return null;
    const code = /^[A-Z]$/.test(key) ? `Key${key}` : /^[0-9]$/.test(key) ? `Digit${key}` : key;
    return { code, ctrl: modifiers.has("CTRL"), alt: modifiers.has("ALT"), shift: modifiers.has("SHIFT") };
}
