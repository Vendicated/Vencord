/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Icon } from "@vencord/discord-types";
import { findByPropsLazy, waitFor } from "@webpack";

import { CssColorData, IconSize } from "./types";

let colorKeys: string[] = [];

const Colors = findByPropsLazy("colors", "layout");
export const IconsModule = findByPropsLazy("AngleBracketsIcon", "StaffBadgeIcon") as Record<string, Icon>;

export const iconSizesInPx: Record<string, number> = findByPropsLazy("md", "lg", "xxs");
export const iconSizes: IconSize[] = ["xxs", "xs", "sm", "md", "lg"];

export function getCssColorKeys(): string[] {
    return colorKeys;
}

export const cssColors = new Proxy({} as Record<number, CssColorData>, {
    get: (target, key) => {
        const idx = Number(key);
        if (isNaN(idx)) return undefined;

        if (target[idx]) return target[idx];

        const colorKey = colorKeys[idx];
        if (!colorKey || !Colors.colors[colorKey]?.css) return undefined;

        const name = colorKey.split("_").map(x => x[0].toUpperCase() + x.toLowerCase().slice(1)).join(" ");
        target[idx] = { name, css: Colors.colors[colorKey].css, key: colorKey };
        return target[idx];
    }
});

waitFor(["colors", "layout"], m => {
    colorKeys = Object.keys(m.colors);
});
