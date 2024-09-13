/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Settings } from "@api/Settings";
import type { PluginIpcMappings } from "@main/ipcPlugins";
import type { UserThemeHeader } from "@main/themes";
import { IpcEvents } from "@shared/IpcEvents";
import type { IpcRes } from "@utils/types";
import { ipcRenderer } from "electron";

function invoke<T = any>(event: IpcEvents, ...args: unknown[]): Promise<T> {
    return ipcRenderer.invoke(event, ...args);
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function sendSync<T = any>(event: IpcEvents, ...args: unknown[]): T {
    return ipcRenderer.sendSync(event, ...args);
}

const PluginHelpers: Record<string, Record<string, (...args: any[]) => Promise<any>>> = {};
const pluginIpcMap = sendSync<PluginIpcMappings>(IpcEvents.GET_PLUGIN_IPC_METHOD_MAP);

for (const [plugin, methods] of Object.entries(pluginIpcMap)) {
    const map: typeof PluginHelpers[string] = PluginHelpers[plugin] = {};
    for (const [methodName, method] of Object.entries(methods)) {
        map[methodName] = (...args) => invoke(method as IpcEvents, ...args);
    }
}

export default {
    themes: {
        uploadTheme: (fileName: string, fileData: string) => invoke<void>(IpcEvents.UPLOAD_THEME, fileName, fileData),
        deleteTheme: (fileName: string) => invoke<void>(IpcEvents.DELETE_THEME, fileName),
        getThemesDir: () => invoke<string>(IpcEvents.GET_THEMES_DIR),
        getThemesList: () => invoke<UserThemeHeader[]>(IpcEvents.GET_THEMES_LIST),
        getThemeData: (fileName: string) => invoke<string | undefined>(IpcEvents.GET_THEME_DATA, fileName),
        getSystemValues: () => invoke<Record<string, string>>(IpcEvents.GET_THEME_SYSTEM_VALUES),
    },

    updater: {
        getUpdates: () => invoke<IpcRes<Record<"hash" | "author" | "message", string>[]>>(IpcEvents.GET_UPDATES),
        update: () => invoke<IpcRes<boolean>>(IpcEvents.UPDATE),
        rebuild: () => invoke<IpcRes<boolean>>(IpcEvents.BUILD),
        getRepo: () => invoke<IpcRes<string>>(IpcEvents.GET_REPO),
    },

    settings: {
        get: () => sendSync<Settings>(IpcEvents.GET_SETTINGS),
        set: (settings: Settings, pathToNotify?: string) => invoke<void>(IpcEvents.SET_SETTINGS, settings, pathToNotify),
        getSettingsDir: () => invoke<string>(IpcEvents.GET_SETTINGS_DIR),
    },

    quickCss: {
        get: () => invoke<string>(IpcEvents.GET_QUICK_CSS),
        set: (css: string) => invoke<void>(IpcEvents.SET_QUICK_CSS, css),

        addChangeListener(cb: (newCss: string) => void) {
            ipcRenderer.on(IpcEvents.QUICK_CSS_UPDATE, (_, css) => { cb(css); });
        },

        addThemeChangeListener(cb: () => void) {
            ipcRenderer.on(IpcEvents.THEME_UPDATE, () => { cb(); });
        },

        openFile: () => invoke<void>(IpcEvents.OPEN_QUICKCSS),
        openEditor: () => invoke<void>(IpcEvents.OPEN_MONACO_EDITOR),
    },

    native: {
        getVersions: (): Partial<NodeJS.ProcessVersions> => process.versions,
        openExternal: (url: string) => invoke<void>(IpcEvents.OPEN_EXTERNAL, url)
    },

    pluginHelpers: PluginHelpers
};
