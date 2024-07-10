/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ToggledTheme } from "./types";

function getMinutesFromMidnight(time: string) {
    // time is necessarily in HH:MM format
    const separatedTime = time.split(":");
    return parseInt(separatedTime[0]) * 60 + parseInt(separatedTime[1]);
}

/**
 * @param lightThemeStartTime The "Light Theme Start Time" setting, in HH:MM format
 * @param darkThemeStartTime The "Dark Theme Start Time" setting, in HH:MM format
 * @returns Whether the current theme should be Light or Dark
 */
export function getExpectedTheme(lightThemeStartTime: string, darkThemeStartTime: string): ToggledTheme {
    const now = new Date().getHours() * 60 + new Date().getMinutes();
    let lightStartDate = getMinutesFromMidnight(lightThemeStartTime);
    let darkStartDate = getMinutesFromMidnight(darkThemeStartTime);

    // dates that are already in the past are sent 1 day later
    if (lightStartDate <= now) lightStartDate += 24 * 60;
    if (darkStartDate <= now) darkStartDate += 24 * 60;

    // if the next switch is a switch to Light theme, this means the current theme is Dark
    return lightStartDate < darkStartDate ? ToggledTheme.Dark : ToggledTheme.Light;
}
