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

// listeners for ipc.on
const cssListeners = new Set<(css: string) => void>();
const NOOP = () => { };
const NOOP_ASYNC = async () => { };

const setCssDebounced = debounce((css: string) => VencordNative.quickCss.set(css));

const themeStore = DataStore.createStore("VencordThemes", "VencordThemeData");

// probably should make this less cursed at some point
window.VencordNative = {
    themes: {
        uploadTheme: (fileName: string, fileData: string) => DataStore.set(fileName, fileData, themeStore),
        deleteTheme: (fileName: string) => DataStore.del(fileName, themeStore),
        getThemesList: () => DataStore.entries(themeStore).then(entries =>
            entries.map(([name, css]) => getThemeInfo(css, name.toString()))
        ),
        getThemeData: (fileName: string) => DataStore.get(fileName, themeStore),
        getSystemValues: async () => ({}),

        openFolder: async () => Promise.reject("themes:openFolder is not supported on web"),
    },

    native: {
        getVersions: () => ({}),
        openExternal: async (url) => void open(url, "_blank")
    },

    updater: {
        getRepo: async () => ({ ok: true, value: "https://github.com/Vendicated/Vencord" }),
        getUpdates: async () => ({ ok: true, value: [] }),
        update: async () => ({ ok: true, value: false }),
        rebuild: async () => ({ ok: true, value: true }),
    },

    quickCss: {
        get: () => DataStore.get("VencordQuickCss").then(s => s ?? ""),
        set: async (css: string) => {
            await DataStore.set("VencordQuickCss", css);
            cssListeners.forEach(l => l(css));
        },
        addChangeListener(cb) {
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
            const win = open("about:blank", "VencordQuickCss", features);
            if (!win) {
                alert("Failed to open QuickCSS popup. Make sure to allow popups!");
                return;
            }

            win.baseUrl = EXTENSION_BASE_URL;
            win.setCss = setCssDebounced;
            win.getCurrentCss = () => VencordNative.quickCss.get();
            win.getTheme = () =>
                getTheme() === Theme.Light
                    ? "vs-light"
                    : "vs-dark";

            win.document.write(monacoHtmlLocal);
        },
    },

    settings: {
        get: () => {
            try {
                return JSON.parse(localStorage.getItem("VencordSettings") || "{}");
            } catch (e) {
                console.error("Failed to parse settings from localStorage: ", e);
                return {};
            }
        },
        set: async (s: Settings) => localStorage.setItem("VencordSettings", JSON.stringify(s)),
        openFolder: async () => Promise.reject("settings:openFolder is not supported on web"),
    },

    pluginHelpers: {} as any,
    csp: {} as any,
};
