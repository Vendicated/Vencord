/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const COLOR_PICKER_DATA_KEY = "vs-color-picker-latest" as const;
export const regex = [
    /(#(?:[0-9a-fA-F]{3}){1,2})/g,
    /(rgb\(\s*?\d+?\s*?,\s*?\d+?\s*?,\s*?\d+?\s*?\))/g,
    /(hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\))/g
] as const;
export const savedColors: number[] = [];
