/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { findByCodeLazy } from "@webpack";

import { DiscordTheme } from "./types";

const logger = new Logger("AutoThemeSwitcher", "#BBBBBB");

interface SaveThemeRequest {
    theme: string;
    backgroundGradientPresetId?: number;
}

const saveClientTheme: (theme: SaveThemeRequest) => void
    = findByCodeLazy('type:"UNSYNCED_USER_SETTINGS_UPDATE",settings:{useSystemTheme:"system"===');

/**
 * @param theme A Discord theme
 * @returns An HTML ID-friendly identifier for the theme
 */
export function themeToString(theme: DiscordTheme) {
    return theme.theme + "-" + theme.id;
}

/**
 * Changes the Discord theme to the specified one.
 * @param theme The identifier of the Discord theme to set (as returned by {@link themeToString})
 */
export function changeDiscordTheme(theme: string) {
    const themeComponents = theme.split("-");
    const saveThemeRequest: SaveThemeRequest = { theme: themeComponents[0] };

    const themeId = parseInt(themeComponents[1]);
    if (!isNaN(themeId)) {
        saveThemeRequest.backgroundGradientPresetId = themeId;
    }

    saveClientTheme(saveThemeRequest);
    logger.info("Discord Theme changed to", saveThemeRequest);
}

/**
 * Changes the "Theme Links" setting of Vencord to the provided CSS URLs.
 * @param urls The new CSS URLs (1 per line)
 */
export function changeCustomCssUrls(urls: string) {
    Settings.themeLinks = [...new Set(
        urls
            .trim()
            .split(/\n+/)
            .map(s => s.trim())
            .filter(Boolean)
    )];

    logger.info("Vencord Theme Links changed to", Settings.themeLinks);
}
