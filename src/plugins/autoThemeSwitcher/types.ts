/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * The 2 themes that this plugin can toggle between: Light and Dark.
 */
export enum ToggledTheme {
    Light,
    Dark
}

/**
 * A vanilla Discord theme: light, dark, or Nitro themes.
 */
export interface DiscordTheme {
    getName(): string;
    theme: string;

    // Only defined for Nitro themes
    id?: number;
    angle?: number;
    colors?: Array<NitroThemeColor>;
    midpointPercentage?: number;
}

export interface NitroThemeColor {
    token: string;
    stop: number;
}
