/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

import { ToggledTheme } from "./theme-types";

const logger = new Logger("AutoThemeSwitcher", "#BBBBBB");

// HH:MM
export const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;

function getMinutesFromMidnight(time: string) {
    const regexec = timeRegex.exec(time);
    if (regexec === null) {
        logger.error("Failed to extract time from string:", time);
        return 0;
    }

    return parseInt(regexec[1]) * 60 + parseInt(regexec[2]);
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
