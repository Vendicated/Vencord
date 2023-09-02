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

import { addSettingsListener, Settings } from "@api/Settings";
import { parse as usercssParse } from "@utils/themes/usercss";

let style: HTMLStyleElement;
let themesStyle: HTMLStyleElement;

export async function toggle(isEnabled: boolean) {
    if (!style) {
        if (isEnabled) {
            style = document.createElement("style");
            style.id = "vencord-custom-css";
            document.documentElement.appendChild(style);
            VencordNative.quickCss.addChangeListener(css => {
                style.textContent = css;
                // At the time of writing this, changing textContent resets the disabled state
                style.disabled = !Settings.useQuickCss;
            });
            style.textContent = await VencordNative.quickCss.get();
        }
    } else
        style.disabled = !isEnabled;
}

async function initThemes() {
    if (!themesStyle) {
        themesStyle = document.createElement("style");
        themesStyle.id = "vencord-themes";
        document.documentElement.appendChild(themesStyle);
    }

    const { themeLinks, enabledThemes, userCssVars } = Settings;

    const links: string[] = [...themeLinks];

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

    const cssVars: string[] = [];

    // for UserCSS, we need to inject the variables
    for (const theme of enabledThemes) {
        if (!theme.endsWith(".user.css")) continue;

        const themeData = await VencordNative.themes.getThemeData(theme);
        if (!themeData) continue;

        const { vars } = usercssParse(themeData, theme);

        for (const [id, meta] of Object.entries(vars)) {
            let normalizedValue: string = userCssVars[id] ?? meta.default;

            if (meta.type === "range") {
                normalizedValue = `${normalizedValue}${meta.units ?? ""}`;
            }

            cssVars.push(`--${id}: ${normalizedValue};`);
        }
    }

    themesStyle.textContent = links.map(link => `@import url("${link.trim()}");`).join("\n");
    if (cssVars.length > 0) themesStyle.textContent += `:root{${cssVars.join("\n")}}`;
}

document.addEventListener("DOMContentLoaded", () => {
    initThemes();

    toggle(Settings.useQuickCss);
    addSettingsListener("useQuickCss", toggle);

    addSettingsListener("themeLinks", initThemes);
    addSettingsListener("enabledThemes", initThemes);

    if (!IS_WEB)
        VencordNative.quickCss.addThemeChangeListener(initThemes);
});
