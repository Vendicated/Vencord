/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getIntlMessage } from "@utils/discord";
import { PluginSettingSelectOption } from "@utils/types";
import { mapMangledModuleLazy } from "@webpack";

import * as themeToggler from "./themeToggler";
import { DiscordTheme, ToggledTheme } from "./types";

const classicThemeList: Array<DiscordTheme> = [
    { theme: "light", getName: () => getIntlMessage("THEME_LIGHT") },
    { theme: "dark", getName: () => getIntlMessage("THEME_DARK") },
];
const nitroThemeList: { themes: Array<DiscordTheme>; } = mapMangledModuleLazy(",colors:[{", {
    themes: t => Array.isArray(t) && t[0].colors
});

/**
 * @param defaultValue Which of the Light or Dark theme should be selected by default
 * @returns The options for a dropdown that contains Light, Dark and all Nitro themes
 */
export function getSelectOptions(defaultValue: ToggledTheme): PluginSettingSelectOption[] {
    const list = [...classicThemeList, ...nitroThemeList.themes].map(theme => ({
        label: theme.getName(),
        value: themeToggler.themeToString(theme),
        default: false
    }));

    const defaultIndex = defaultValue === ToggledTheme.Light ? 0 : 1;
    list[defaultIndex].default = true;

    return list;
}
