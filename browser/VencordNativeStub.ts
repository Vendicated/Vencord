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

import * as DataStore from "../src/api/DataStore";

// Discord deletes this so need to store in variable
const { localStorage } = window;

// listeners for ipc.on
const cssListeners = new Set<(css: string) => void>();
const NOOP = () => { };
const NOOP_ASYNC = async () => { };

// probably should make this less cursed at some point
(window as typeof window & { VencordNative: typeof import("../src/VencordNative").default; }).VencordNative = {
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
        openEditor: NOOP_ASYNC,
        openFile: NOOP_ASYNC
    },

    settings: {
        get: () => localStorage.getItem("VencordSettings") || "{}",
        set: async (s: string) => localStorage.setItem("VencordSettings", s),
        getSettingsDir: async () => "LocalStorage"
    }
};
