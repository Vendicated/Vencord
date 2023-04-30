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

import monacoHtml from "~fileContent/../src/components/monacoWin.html";
import * as DataStore from "../src/api/DataStore";
import { debounce } from "../src/utils";
import { getTheme, Theme } from "../src/utils/discord";

// Discord deletes this so need to store in variable
const { localStorage } = window;

// listeners for ipc.on
const cssListeners = new Set<(css: string) => void>();
const NOOP = () => { };
const NOOP_ASYNC = async () => { };

const setCssDebounced = debounce((css: string) => VencordNative.quickCss.set(css));

// probably should make this less cursed at some point
window.VencordNative = {
    native: {
        getVersions: () => ({}),
        openExternal: async (url) => void open(url, "_blank")
    },

    updater: {
        getRepo: async () => "https://github.com/Vendicated/Vencord",
        getUpdates: async () => ({ ok: true, value: [] }),
        rebuild: NOOP_ASYNC,
        update: NOOP_ASYNC
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
        openFile: NOOP_ASYNC,
        async openEditor() {
            const features = `popup,width=${Math.min(window.innerWidth, 1000)},height=${Math.min(window.innerHeight, 1000)}`;
            const win = open("about:blank", "VencordQuickCss", features);
            if (!win) {
                alert("Failed to open QuickCSS popup. Make sure to allow popups!");
                return;
            }

            win.setCss = setCssDebounced;
            win.getCurrentCss = () => VencordNative.quickCss.get();
            win.getTheme = () =>
                getTheme() === Theme.Light
                    ? "vs-light"
                    : "vs-dark";

            win.document.write(monacoHtml);
        },
    },

    settings: {
        get: () => localStorage.getItem("VencordSettings") || "{}",
        set: async (s: string) => localStorage.setItem("VencordSettings", s),
        getSettingsDir: async () => "LocalStorage"
    }
};
