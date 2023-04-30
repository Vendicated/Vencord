/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022
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

import { default as IPC_EVENTS, default as IpcEvents } from "@utils/IpcEvents";
import { IpcRes } from "@utils/types";
import { ipcRenderer } from "electron";

function invoke<T = any>(event: IPC_EVENTS, ...args: any[]) {
    return ipcRenderer.invoke(event, ...args) as Promise<T>;
}

export function sendSync<T = any>(event: IPC_EVENTS, ...args: any[]) {
    return ipcRenderer.sendSync(event, ...args) as T;
}

export default {
    updater: {
        getUpdates: () => invoke<IpcRes<Record<"hash" | "author" | "message", string>[]>>(IPC_EVENTS.GET_UPDATES),
        update: () => invoke<IpcRes<boolean>>(IPC_EVENTS.UPDATE),
        rebuild: () => invoke<IpcRes<void>>(IPC_EVENTS.BUILD),
        getRepo: () => invoke<IpcRes<string>>(IPC_EVENTS.GET_REPO),
    },

    settings: {
        get: () => sendSync<string>(IpcEvents.GET_SETTINGS),
        set: (settings: string) => invoke<void>(IpcEvents.SET_SETTINGS, settings),
        getSettingsDir: () => invoke<string>(IPC_EVENTS.GET_SETTINGS_DIR),
    },

    quickCss: {
        get: () => invoke<string>(IpcEvents.GET_QUICK_CSS),
        set: (css: string) => invoke<void>(IpcEvents.SET_QUICK_CSS, css),
        onChange: (cb: (newCss: string) => void) => void ipcRenderer.on(IpcEvents.OPEN_QUICKCSS, (_, css) => cb(css)),

        openFile: () => invoke<void>(IpcEvents.OPEN_QUICKCSS),
        openEditor: () => invoke<void>(IpcEvents.OPEN_MONACO_EDITOR),
    },

    native: {
        getVersions: () => process.versions,
        openExternal: (url: string) => invoke<void>(IpcEvents.OPEN_EXTERNAL, url)
    },
};
