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
import { Toasts } from "@webpack/common";

import { Logger } from "./Logger";
import { compileUsercss } from "./themes/usercss/compiler";

const logger = new Logger("QuickCSS");


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
    themesStyle ??= createStyle("vencord-themes");

    const { enabledThemeLinks, enabledThemes } = Settings;

    const links: string[] = [...enabledThemeLinks];

    if (IS_WEB) {
        for (let i = enabledThemes.length - 1; i >= 0; i--) {
            const theme = enabledThemes[i];

            try {
                var themeData = await VencordNative.themes.getThemeData(theme);
            } catch (e) {
                logger.warn("Failed to get theme data for", theme, "(has it gone missing?)", e);
            }

            if (!themeData) {
                // disable the theme since it has problems
                Settings.enabledThemes = enabledThemes.splice(enabledThemes.indexOf(theme), 1);
                continue;
            }

            const blob = new Blob([themeData], { type: "text/css" });
            links.push(URL.createObjectURL(blob));
        }
    } else {
        for (let i = enabledThemes.length - 1; i >= 0; i--) {
            const theme = enabledThemes[i];

            if (theme.endsWith(".user.css")) continue;

            try {
                // whilst this is unnecessary here, we're doing it to make sure the theme is valid
                await VencordNative.themes.getThemeData(theme);
            } catch (e) {
                logger.warn("Failed to get theme data for", theme, "(has it gone missing?)", e);
                Settings.enabledThemes = enabledThemes.splice(enabledThemes.indexOf(theme), 1);
                continue;
            }

            links.push(`vencord:///themes/${theme}?v=${Date.now()}`);
        }
    }

    if (!IS_WEB || "armcord" in window) {
        for (let i = enabledThemes.length - 1; i >= 0; i--) {
            const theme = enabledThemes[i];

            if (!theme.endsWith(".user.css")) continue;

            // UserCSS goes through a compile step first
            const css = await compileUsercss(theme);
            if (!css) {
                // let's not leave the user in the dark about this and point them to where they can find the error
                Toasts.show({
                    message: `Failed to compile ${theme}, check the console for more info.`,
                    type: Toasts.Type.FAILURE,
                    id: Toasts.genId(),
                    options: {
                        position: Toasts.Position.BOTTOM
                    }
                });
                Settings.enabledThemes = enabledThemes.splice(enabledThemes.indexOf(theme), 1);
                continue;
            }

            const blob = new Blob([css], { type: "text/css" });
            links.push(URL.createObjectURL(blob));
        }
    }

    if (!IS_WEB || "armcord" in window) {
        for (const theme of enabledThemes) if (theme.endsWith(".user.css")) {
            // UserCSS goes through a compile step first
            const css = await compileUsercss(theme);
            if (!css) {
                // let's not leave the user in the dark about this and point them to where they can find the error
                Toasts.show({
                    message: `Failed to compile ${theme}, check the console for more info.`,
                    type: Toasts.Type.FAILURE,
                    id: Toasts.genId(),
                    options: {
                        position: Toasts.Position.BOTTOM
                    }
                });
                continue;
            }

            const blob = new Blob([css], { type: "text/css" });
            links.push(URL.createObjectURL(blob));
        }
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
    SettingsStore.addChangeListener("userCssVars", initThemes);

    if (!IS_WEB)
        VencordNative.quickCss.addThemeChangeListener(initThemes);
});
