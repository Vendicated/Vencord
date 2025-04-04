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
import { ThemeStore } from "@webpack/common";


let style: HTMLStyleElement;
let themesStyle: HTMLStyleElement;

function createStyle(id: string) {
    const style = document.createElement("style");
    style.id = id;
    document.documentElement.append(style);
    return style;
}

async function initSystemValues() {
    const values = await VencordNative.themes.getSystemValues();
    const variables = Object.entries(values)
        .filter(([, v]) => v !== "#")
        .map(([k, v]) => `--${k}: ${v};`)
        .join("");

    createStyle("vencord-os-theme-values").textContent = `:root{${variables}}`;
}

export async function toggle(isEnabled: boolean) {
    if (!style) {
        if (isEnabled) {
            style = createStyle("vencord-custom-css");

            VencordNative.quickCss.addChangeListener(css => {
                css = patchSidebar(css);
                style.textContent = css;
                style.disabled = !Settings.useQuickCss;
            });

            const css = await VencordNative.quickCss.get();
            style.textContent = patchSidebar(css);
        }
    } else {
        style.disabled = !isEnabled;
    }
}

function patchSidebar(css: string): string {
    if (
        css.includes("grid-template-columns") && Settings.plugins.BetterFolders.enabled ||
        css.includes("grid-template-areas") && Settings.plugins.BetterFolders.enabled
    ) {
        css = css.replace(
            /(["'])([^"']*?)guildsList\s+/g,
            (_, quote, pre) => `${quote}${pre}guildsList sidebar `
        );
        css = css.replace(
            /guildsEnd\]/g,
            "guildsEnd] min-content [sidebarEnd]"
        );
    }
    return css;
}

async function initThemes() {
    themesStyle ??= createStyle("vencord-themes");

    const { enabledThemeLinks, enabledThemes } = Settings;
    const enabledlinks: string[] = [...enabledThemeLinks];
    const activeTheme = ThemeStore.theme === "light" ? "light" : "dark";

    const rawLinks = enabledlinks
        .map(rawLink => {
            const match = /^@(light|dark) (.*)/.exec(rawLink);
            if (!match) return rawLink;

            const [, mode, link] = match;
            return mode === activeTheme ? link : null;
        })
        .filter((link): link is string => link !== null);

    const links: string[] = [];

    for (const url of rawLinks) {
        try {
            const res = await fetch(url);
            const css = await res.text();
            const patched = patchSidebar(css);
            const blob = new Blob([patched], { type: "text/css" });
            links.push(URL.createObjectURL(blob));
        } catch (e) {
            console.warn(`Failed to fetch theme from ${url}`, e);
        }
    }

    for (const theme of enabledThemes) {
        const themeData = await VencordNative.themes.getThemeData(theme);
        if (!themeData) continue;

        const patchedTheme = patchSidebar(themeData);
        const blob = new Blob([patchedTheme], { type: "text/css" });
        links.push(URL.createObjectURL(blob));
    }

    themesStyle.textContent = links.map(link => `@import url("${link.trim()}");`).join("\n");
}

document.addEventListener("DOMContentLoaded", () => {
    initSystemValues();
    initThemes();

    toggle(Settings.useQuickCss);
    SettingsStore.addChangeListener("useQuickCss", toggle);

    SettingsStore.addChangeListener("enabledThemeLinks", initThemes);
    SettingsStore.addChangeListener("enabledThemes", initThemes);
    ThemeStore.addChangeListener(initThemes);

    if (!IS_WEB)
        VencordNative.quickCss.addThemeChangeListener(initThemes);
});
