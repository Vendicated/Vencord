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

import { Settings, SettingsStore } from "@api/Settings";
import { Theme } from "@vencord/discord-types";
import { ThemeStore } from "@webpack/common";


let style: HTMLStyleElement | undefined;
let themesStyle: HTMLStyleElement | undefined;

function createStyle(id: string) {
    const style = document.createElement("style");
    style.id = id;
    document.documentElement.append(style);
    return style;
}

async function initSystemValues() {
    const values = await VencordNative.themes.getSystemValues();
    let variables = "";
    for (const [k, v] of Object.entries(values))
        if (v !== "#") variables += `--${k}: ${v};`;

    createStyle("vencord-os-theme-values").textContent = `:root{${variables}}`;
}

export async function toggle(isEnabled: boolean) {
    if (!style) {
        if (isEnabled) {
            style = createStyle("vencord-custom-css");
            VencordNative.quickCss.addChangeListener(css => {
                style!.textContent = css;
                // At the time of writing this, changing textContent resets the disabled state
                style!.disabled = !Settings.useQuickCss;
            });
            style.textContent = await VencordNative.quickCss.get();
        }
    } else
        style.disabled = !isEnabled;
}

async function initThemes() {
    themesStyle ??= createStyle("vencord-themes");

    const { themeLinks, enabledThemes } = Settings;

    // "darker" and "midnight" both count as dark
    const activeTheme = ThemeStore.theme === Theme.LIGHT ? Theme.LIGHT : Theme.DARK;

    const links: string[] = [];
    for (const rawLink of themeLinks) {
        const match = /^@(light|dark) (.*)/.exec(rawLink);
        if (match) {
            const [, mode, link] = match;
            if (mode === activeTheme) links.push(link!);
        } else links.push(rawLink);
    }

    if (IS_WEB) {
        for (const theme of enabledThemes) {
            const themeData = await VencordNative.themes.getThemeData(theme);
            if (!themeData) continue;
            const blob = new Blob([themeData], { type: "text/css" });
            links.push(URL.createObjectURL(blob));
        }
    } else {
        const localThemes = enabledThemes.map(theme => `vencord:///themes/${theme}?v=${Date.now()}`);
        links.push(...localThemes);
    }

    themesStyle.textContent = links.map(link => `@import url("${link.trim()}");`).join("\n");
}

document.addEventListener("DOMContentLoaded", () => {
    initSystemValues();
    initThemes();

    toggle(Settings.useQuickCss);
    SettingsStore.addChangeListener("useQuickCss", toggle);

    SettingsStore.addChangeListener("themeLinks", initThemes);
    SettingsStore.addChangeListener("enabledThemes", initThemes);
    ThemeStore.addChangeListener(initThemes);

    if (!IS_WEB)
        VencordNative.quickCss.addThemeChangeListener(initThemes);
});
