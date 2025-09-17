/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Settings } from "@api/Settings";
import { CspRequestResult } from "@main/csp/manager";
import { PluginIpcMappings } from "@main/ipcPlugins";
import type { UserThemeHeader } from "@main/themes";
import { IpcEvents } from "@shared/IpcEvents";
import { IpcRes } from "@utils/types";
import { ipcRenderer } from "electron";

function invoke<T = any>(event: IpcEvents, ...args: any[]) {
    return ipcRenderer.invoke(event, ...args) as Promise<T>;
}

export function sendSync<T = any>(event: IpcEvents, ...args: any[]) {
    return ipcRenderer.sendSync(event, ...args) as T;
}

const PluginHelpers = {} as Record<string, Record<string, (...args: any[]) => Promise<any>>>;
const pluginIpcMap = sendSync<PluginIpcMappings>(IpcEvents.GET_PLUGIN_IPC_METHOD_MAP);

for (const [plugin, methods] of Object.entries(pluginIpcMap)) {
    const map = PluginHelpers[plugin] = {};
    for (const [methodName, method] of Object.entries(methods)) {
        map[methodName] = (...args: any[]) => invoke(method as IpcEvents, ...args);
    }
}

export default {
    themes: {
        uploadTheme: (fileName: string, fileData: string) => invoke<void>(IpcEvents.UPLOAD_THEME, fileName, fileData),
        deleteTheme: (fileName: string) => invoke<void>(IpcEvents.DELETE_THEME, fileName),
        getThemesList: () => invoke<Array<UserThemeHeader>>(IpcEvents.GET_THEMES_LIST),
        getThemeData: (fileName: string) => invoke<string | undefined>(IpcEvents.GET_THEME_DATA, fileName),
        getSystemValues: () => invoke<Record<string, string>>(IpcEvents.GET_THEME_SYSTEM_VALUES),

        openFolder: () => invoke<void>(IpcEvents.OPEN_THEMES_FOLDER),
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

        openFolder: () => invoke<void>(IpcEvents.OPEN_SETTINGS_FOLDER),
    },

    quickCss: {
        get: () => invoke<string>(IpcEvents.GET_QUICK_CSS),
        set: (css: string) => invoke<void>(IpcEvents.SET_QUICK_CSS, css),

        addChangeListener(cb: (newCss: string) => void) {
            ipcRenderer.on(IpcEvents.QUICK_CSS_UPDATE, (_, css) => cb(css));
        },

        addThemeChangeListener(cb: () => void) {
            ipcRenderer.on(IpcEvents.THEME_UPDATE, () => cb());
        },

        openFile: () => invoke<void>(IpcEvents.OPEN_QUICKCSS),
        openEditor: () => invoke<void>(IpcEvents.OPEN_MONACO_EDITOR),
    },

    native: {
        getVersions: () => process.versions as Partial<NodeJS.ProcessVersions>,
        openExternal: (url: string) => invoke<void>(IpcEvents.OPEN_EXTERNAL, url)
    },

    csp: {
        /**
         * Note: Only supports full explicit matches, not wildcards.
         *
         * If `*.example.com` is allowed, `isDomainAllowed("https://sub.example.com")` will return false.
         */
        isDomainAllowed: (url: string, directives: string[]) => invoke<boolean>(IpcEvents.CSP_IS_DOMAIN_ALLOWED, url, directives),
        removeOverride: (url: string) => invoke<boolean>(IpcEvents.CSP_REMOVE_OVERRIDE, url),
        requestAddOverride: (url: string, directives: string[], callerName: string) =>
            invoke<CspRequestResult>(IpcEvents.CSP_REQUEST_ADD_OVERRIDE, url, directives, callerName),
    },

    pluginHelpers: PluginHelpers
};
