/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { useSettings } from "@api/settings";

import { shiki } from "../api/shiki";
import { ShikiSettings } from "../types";

export function useShikiSettings(settingKeys: (keyof ShikiSettings)[], overrides?: Record<string, any>) {
    const settings = useSettings(settingKeys.map(key => `plugins.ShikiCodeblocks.${key}`)).plugins.ShikiCodeblocks as ShikiSettings;

    const withOverrides = { ...settings, ...overrides };

    const themeUrl = withOverrides.customTheme || withOverrides.theme;
    if (themeUrl !== shiki.currentThemeUrl) shiki.setTheme(themeUrl);

    return {
        ...withOverrides,
        isThemeLoading: themeUrl !== shiki.currentThemeUrl,
    };
}
