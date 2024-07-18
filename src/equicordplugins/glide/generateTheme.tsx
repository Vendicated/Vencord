/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function generateRandomColorHex(): string {
    const r = Math.floor(Math.random() * 90);
    const g = Math.floor(Math.random() * 90);
    const b = Math.floor(Math.random() * 90);

    return `${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function darkenColorHex(color: string): string {
    const hex = color.replace(/^#/, "");
    const bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    r = Math.max(r - 5, 0);
    g = Math.max(g - 5, 0);
    b = Math.max(b - 5, 0);
    return `${((r << 16) + (g << 8) + b).toString(16).padStart(6, "0")}`;
}

export function saturateColorHex(color: string): string {
    // i should really do something with this at some point :P
    return color;
}
