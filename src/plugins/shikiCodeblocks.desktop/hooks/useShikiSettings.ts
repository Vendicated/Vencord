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
