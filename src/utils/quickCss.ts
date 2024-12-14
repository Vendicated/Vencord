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
import { FluxDispatcher, ThemeStore } from "@webpack/common";

const PopoutWindowStore = findStoreLazy("PopoutWindowStore");

class StyleManager {
    style: HTMLStyleElement | null = null;
    themesStyle: HTMLStyleElement | null = null;
    systemValuesStyle: HTMLStyleElement | null = null;
    doc: Document;

    constructor(doc: Document) {
        this.doc = doc;
    }

    createStyle(id: string) {
        const style = this.doc.createElement("style");
        style.id = id;
        this.doc.documentElement.appendChild(style);
        return style;
    }

    async initSystemValues() {
        const values = await VencordNative.themes.getSystemValues();
        const variables = Object.entries(values)
            .filter(([, v]) => v !== "#")
            .map(([k, v]) => `--${k}: ${v};`)
            .join("");

        this.createStyle("vencord-os-theme-values").textContent = `:root{${variables}}`;
    }

    async toggleCustomCSS(isEnabled: boolean) {
        if (!this.style) {
            if (isEnabled) {
                this.style = this.createStyle("vencord-custom-css");
                VencordNative.quickCss.addChangeListener(css => {
                    this.style!.textContent = css;
                    // At the time of writing this, changing textContent resets the disabled state
                    this.style!.disabled = !Settings.useQuickCss;
                });
                this.style.textContent = await VencordNative.quickCss.get();
            }
        } else
            this.style.disabled = !isEnabled;
    }

    async initThemes() {
        this.themesStyle ??= this.createStyle("vencord-themes");
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

        this.themesStyle.textContent = links.map(link => `@import url("${link.trim()}");`).join("\n");
    }

    async init() {
        await this.initSystemValues();
        await this.initThemes();

        await this.toggleCustomCSS(Settings.useQuickCss);
        SettingsStore.addChangeListener("useQuickCss", this.toggleCustomCSS);

        SettingsStore.addChangeListener("themeLinks", this.initThemes);
        SettingsStore.addChangeListener("enabledThemes", this.initThemes);
        ThemeStore.addChangeListener(this.initThemes);

        if (!IS_WEB)
            VencordNative.quickCss.addThemeChangeListener(this.initThemes);
    }

    destroy() {
        this.style?.remove();
        this.themesStyle?.remove();
        this.systemValuesStyle?.remove();

        SettingsStore.removeChangeListener("useQuickCss", this.toggleCustomCSS);
        SettingsStore.removeChangeListener("themeLinks", this.initThemes);
        SettingsStore.removeChangeListener("enabledThemes", this.initThemes);
        ThemeStore.removeChangeListener(this.initThemes);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const mainWindowManager = new StyleManager(document);
    mainWindowManager.init();

    FluxDispatcher.subscribe("POPOUT_WINDOW_OPEN", () => {
        const windowKeys = PopoutWindowStore.getWindowKeys();
        const popoutWindow = PopoutWindowStore.getWindow(windowKeys[windowKeys.length - 1]);
        const maxWait = 5000;
        let elapsed = 0;

        const interval = setInterval(() => {
            if (popoutWindow.document.readyState === "complete") {
                clearInterval(interval);

                const doc = popoutWindow.document;
                const popoutWindowManager = new StyleManager(doc);

                const style = doc.createElement("style");
                style.id = "vencord-css-core";
                style.textContent = document.getElementById("vencord-css-core")!.textContent;
                doc.documentElement.appendChild(style);

                popoutWindowManager.init();

                popoutWindow.addEventListener("beforeunload", () => {
                    popoutWindowManager.destroy();
                });
            }

            if (elapsed >= maxWait) {
                clearInterval(interval);
            }

            elapsed += 500;
        }, 500);
    });
});
