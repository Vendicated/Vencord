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

/// <reference path="../src/modules.d.ts" />
/// <reference path="../src/globals.d.ts" />

import monacoHtmlLocal from "file://monacoWin.html?minify";
import * as DataStore from "../src/api/DataStore";
import { debounce, localStorage } from "../src/utils";
import { EXTENSION_BASE_URL } from "../src/utils/web-metadata";
import { getTheme, Theme } from "../src/utils/discord";
import { getThemeInfo } from "../src/main/themes";
import { Settings } from "../src/Vencord";
import { getStylusWebStoreUrl } from "@utils/web";

const STORAGE_KEYS = {
    THEMES_STORE_NAME: "VencordThemes",
    THEMES_DATA_NAME: "VencordThemeData",
    QUICK_CSS: "VencordQuickCss",
    SETTINGS: "VencordSettings",
};
const NOOP = () => {};
const NOOP_ASYNC = async () => {};
const cssListeners = new Set<(css: string) => void>();
const setCssDebounced = debounce((css: string) => VencordNative.quickCss.set(css), 250);
const themeStore = DataStore.createStore(STORAGE_KEYS.THEMES_STORE_NAME, STORAGE_KEYS.THEMES_DATA_NAME);
const themesModule = {
    uploadTheme: (fileName: string, fileData: string) => DataStore.set(fileName, fileData, themeStore),
    deleteTheme: (fileName: string) => DataStore.del(fileName, themeStore),
    getThemesList: async () => {
        try {
            const entries = await DataStore.entries(themeStore);
            return entries.map(([name, css]) => getThemeInfo(css, name.toString()));
        } catch (error) {
            console.error("Failed to get themes list:", error);
            return [];
        }
    },
    getThemeData: (fileName: string) => DataStore.get(fileName, themeStore),
    getSystemValues: async () => ({}),
    openFolder: async () => Promise.reject("themes:openFolder is not supported on web"),
};
const nativeModule = {
    getVersions: () => ({}),
    openExternal: async (url: string) => {
        const newWindow = window.open(url, "_blank");
        if (newWindow) newWindow.opener = null;
    },
};
const updaterModule = {
    getRepo: async () => ({ ok: true, value: "https://github.com/Vendicated/Vencord" }),
    getUpdates: async () => ({ ok: true, value: [] }),
    update: async () => ({ ok: true, value: false }),
    rebuild: async () => ({ ok: true, value: true }),
};
const quickCssModule = {
    get: () => DataStore.get(STORAGE_KEYS.QUICK_CSS).then(s => s ?? ""),
    set: async (css: string) => {
        try {
            await DataStore.set(STORAGE_KEYS.QUICK_CSS, css);
            cssListeners.forEach(l => l(css));
        } catch (error) {
            console.error("Failed to set QuickCSS:", error);
        }
    },
    addChangeListener: (cb: (css: string) => void) => {
        cssListeners.add(cb);
    },
    addThemeChangeListener: NOOP,
    openFile: NOOP_ASYNC,
    async openEditor() {
        if (IS_USERSCRIPT) {
            const shouldOpenWebStore = confirm("QuickCSS is not supported on the Userscript. You can instead use the Stylus extension.\n\nDo you want to open the Stylus web store page?");
            if (shouldOpenWebStore) {
                window.open(getStylusWebStoreUrl(), "_blank");
            }
            return;
        }
        const features = `popup,width=${Math.min(window.innerWidth, 1000)},height=${Math.min(window.innerHeight, 1000)}`;
        const win = window.open("about:blank", "VencordQuickCss", features);
        if (!win) {
            alert("Failed to open QuickCSS popup. Make sure to allow popups!");
            return;
        }
        Object.assign(win, {
            baseUrl: EXTENSION_BASE_URL,
            setCss: setCssDebounced,
            getCurrentCss: () => this.get(),
            getTheme: () => getTheme() === Theme.Light ? "vs-light" : "vs-dark",
        });
        win.document.write(monacoHtmlLocal);
    },
};
const settingsModule = {
    get: (): Settings => {
        try {
            const settingsJson = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return JSON.parse(settingsJson || "{}");
        } catch (error) {
            console.error("Failed to parse settings from localStorage: ", error);
            return {};
        }
    },
    set: async (s: Settings) => {
        try {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(s));
        } catch (error) {
            console.error("Failed to save settings to localStorage:", error);
        }
    },
    openFolder: async () => Promise.reject("settings:openFolder is not supported on web"),
};

window.VencordNative = {
    themes: themesModule,
    native: nativeModule,
    updater: updaterModule,
    quickCss: quickCssModule,
    settings: settingsModule,
    pluginHelpers: {} as any,
    csp: {} as any,
};
