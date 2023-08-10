/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PartialExcept } from "@utils/types";
import { React } from "@webpack/common";

import { shiki } from "../api/shiki";
import { settings as pluginSettings, ShikiSettings } from "../settings";

export function useShikiSettings<F extends keyof ShikiSettings>(settingKeys: F[], overrides?: Partial<ShikiSettings>) {
    const settings: Partial<ShikiSettings> = pluginSettings.use(settingKeys);
    const [isLoading, setLoading] = React.useState(false);

    const withOverrides = { ...settings, ...overrides } as PartialExcept<ShikiSettings, F>;
    const themeUrl = withOverrides.customTheme || withOverrides.theme;

    if (overrides) {
        const willChangeTheme = shiki.currentThemeUrl && themeUrl && themeUrl !== shiki.currentThemeUrl;
        const noOverrides = Object.keys(overrides).length === 0;

        if (isLoading && (!willChangeTheme || noOverrides)) setLoading(false);
        if (!isLoading && willChangeTheme) {
            setLoading(true);
            shiki.setTheme(themeUrl);
        }
    }

    return {
        ...withOverrides,
        isThemeLoading: themeUrl !== shiki.currentThemeUrl,
    };
}
