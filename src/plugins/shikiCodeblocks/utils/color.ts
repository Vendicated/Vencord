/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function hex2Rgb(hex: string) {
    hex = hex.slice(1);
    if (hex.length < 6)
        hex = hex
            .split("")
            .map(c => c + c)
            .join("");
    if (hex.length === 6) hex += "ff";
    if (hex.length > 6) hex = hex.slice(0, 6);
    return hex
        .split(/(..)/)
        .filter(Boolean)
        .map(c => parseInt(c, 16));
}
