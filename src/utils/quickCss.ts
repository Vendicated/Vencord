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
import { setStyle } from "@api/Styles";
import { ThemeStore } from "@webpack/common";

async function initSystemValues() {
    const values = await VencordNative.themes.getSystemValues();
    const variables = Object.entries(values)
        .filter(([, v]) => v !== "#")
        .map(([k, v]) => `--${k}: ${v};`)
        .join("");

    setStyle({
        name: "vencord-os-theme-values",
        source: `:root{${variables}}`
    });
}

export async function toggle(isEnabled: boolean, css?: string) {
    setStyle({
        name: "vencord-custom-css",
        source: css || await VencordNative.quickCss.get(),
        enabled: isEnabled
    });
}

async function initThemes() {
    const { themeLinks, enabledThemes } = Settings;

    // "darker" and "midnight" both count as dark
    const activeTheme = ThemeStore.theme === "light" ? "light" : "dark";

    const links = themeLinks
        .map(rawLink => {
            const match = /^@(light|dark) (.*)/.exec(rawLink);
            if (!match) return rawLink;

            const [, mode, link] = match;
            return mode === activeTheme ? link : null;
        })
        .filter(link => link !== null);

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

    setStyle({
        name: "vencord-themes",
        source: links.map(link => `@import url("${link.trim()}");`).join("\n")
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initSystemValues();
    initThemes();

    toggle(Settings.useQuickCss);
    VencordNative.quickCss.addChangeListener(css => {
        toggle(Settings.useQuickCss, css);
    });
    SettingsStore.addChangeListener("useQuickCss", toggle);

    SettingsStore.addChangeListener("themeLinks", initThemes);
    SettingsStore.addChangeListener("enabledThemes", initThemes);
    ThemeStore.addChangeListener(initThemes);

    if (!IS_WEB)
        VencordNative.quickCss.addThemeChangeListener(initThemes);
});
