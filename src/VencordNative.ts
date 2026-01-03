/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Settings } from "@api/Settings";
import type { CspRequestResult } from "@main/csp/manager";
import type { PluginIpcMappings } from "@main/ipcPlugins";
import { IpcEvents } from "@shared/IpcEvents";
import type { IpcRes } from "@utils/types";
import { ipcRenderer } from "electron/renderer";

export function invoke<T = any>(event: IpcEvents, ...args: any[]) {
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
        uploadTheme: async (fileName: string, fileData: string): Promise<void> => {
            throw new Error("uploadTheme is WEB only");
        },
        deleteTheme: (fileName: string) => invoke<void>(IpcEvents.DELETE_THEME, fileName),
        getThemesDir: () => invoke<string>(IpcEvents.GET_THEMES_DIR),
        getThemesList: () => invoke<Array<{ fileName: string; content: string; }>>(IpcEvents.GET_THEMES_LIST),
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
        getSettingsDir: () => invoke<string>(IpcEvents.GET_SETTINGS_DIR),

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
        getEditorTheme: () => sendSync<string>(IpcEvents.GET_MONACO_THEME),
    },

    native: {
        getVersions: () => process.versions as Partial<NodeJS.ProcessVersions>,
        openExternal: (url: string) => invoke<void>(IpcEvents.OPEN_EXTERNAL, url),
        getRendererCss: () => invoke<string>(IpcEvents.GET_RENDERER_CSS),
        onRendererCssUpdate: (cb: (newCss: string) => void) => {
            if (!IS_DEV) return;

            ipcRenderer.on(IpcEvents.RENDERER_CSS_UPDATE, (_e, newCss: string) => cb(newCss));
        }
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
