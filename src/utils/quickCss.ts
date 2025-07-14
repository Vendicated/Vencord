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
import { findStoreLazy } from "@webpack";
import { ThemeStore } from "@webpack/common";

const PopoutWindowStore = findStoreLazy("PopoutWindowStore");

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

async function toggle(isEnabled: boolean) {
    if (!style) {
        if (isEnabled) {
            style = createStyle("vencord-custom-css");
            VencordNative.quickCss.addChangeListener(css => {
                style.textContent = css;
                // At the time of writing this, changing textContent resets the disabled state
                style.disabled = !Settings.useQuickCss;
                updatePopoutWindows();
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
    // This function is first called on DOMContentLoaded, so ThemeStore may not have been loaded yet
    const activeTheme = ThemeStore == null
        ? undefined
        : ThemeStore.theme === "light" ? "light" : "dark";

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

    themesStyle.textContent = links.map(link => `@import url("${link.trim()}");`).join("\n");
    updatePopoutWindows();
}

function applyToPopout(popoutWindow: Window) {
    if (!popoutWindow || !popoutWindow.document) return;

    const doc = popoutWindow.document;

    const styles = [
        { id: "vencord-custom-css", content: style?.textContent ?? "", disabled: !Settings.useQuickCss },
        { id: "vencord-themes", content: themesStyle?.textContent ?? "" },
        { id: "vencord-os-theme-values", content: document.getElementById("vencord-os-theme-values")?.textContent ?? "" }
    ];

    styles.forEach(({ id, content, disabled }) => {
        let popoutStyle = doc.getElementById(id) as HTMLStyleElement;
        if (!popoutStyle) {
            popoutStyle = doc.createElement("style");
            popoutStyle.id = id;
            doc.documentElement.appendChild(popoutStyle);
        }
        popoutStyle.textContent = content;
        if (disabled) {
            popoutStyle.disabled = disabled;
        }
    });
}

function updatePopoutWindows() {
    const windowKeys = PopoutWindowStore.getWindowKeys();
    for (const key of windowKeys) {
        const popoutWindow = PopoutWindowStore.getWindow(key);
        applyToPopout(popoutWindow);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (IS_USERSCRIPT) return;

    initSystemValues();
    initThemes();

    toggle(Settings.useQuickCss);
    SettingsStore.addChangeListener("useQuickCss", toggle);

    SettingsStore.addChangeListener("themeLinks", initThemes);
    SettingsStore.addChangeListener("enabledThemes", initThemes);

    if (!IS_WEB) {
        VencordNative.quickCss.addThemeChangeListener(initThemes);

        window.addEventListener("message", event => {
            const { discordPopoutEvent } = event.data || {};
            if (discordPopoutEvent?.type === "loaded") {
                const popoutWindow = PopoutWindowStore.getWindow(discordPopoutEvent.key);
                applyToPopout(popoutWindow);
                const style = popoutWindow.document.createElement("style");
                style.id = "vencord-css-core";
                style.textContent = document.getElementById("vencord-css-core")!.textContent;
                popoutWindow.document.documentElement.appendChild(style);
            }
        });
    }
}, { once: true });

export function initQuickCssThemeStore() {
    if (IS_USERSCRIPT) return;

    initThemes();

    let currentTheme = ThemeStore.theme;
    ThemeStore.addChangeListener(() => {
        if (currentTheme === ThemeStore.theme) return;

        currentTheme = ThemeStore.theme;
        initThemes();
    });
}
