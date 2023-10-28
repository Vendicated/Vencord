/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcEvents } from "@utils/IpcEvents";
import { IpcRes } from "@utils/types";
import { ipcRenderer } from "electron";
import type { UserThemeHeader } from "main/themes";

function invoke<T = any>(event: IpcEvents, ...args: any[]) {
    return ipcRenderer.invoke(event, ...args) as Promise<T>;
}

export function sendSync<T = any>(event: IpcEvents, ...args: any[]) {
    return ipcRenderer.sendSync(event, ...args) as T;
}

export default {
    themes: {
        uploadTheme: (fileName: string, fileData: string) => invoke<void>(IpcEvents.UPLOAD_THEME, fileName, fileData),
        deleteTheme: (fileName: string) => invoke<void>(IpcEvents.DELETE_THEME, fileName),
        getThemesDir: () => invoke<string>(IpcEvents.GET_THEMES_DIR),
        getThemesList: () => invoke<Array<UserThemeHeader>>(IpcEvents.GET_THEMES_LIST),
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
        get: () => sendSync<string>(IpcEvents.GET_SETTINGS),
        set: (settings: string) => invoke<void>(IpcEvents.SET_SETTINGS, settings),
        getSettingsDir: () => invoke<string>(IpcEvents.GET_SETTINGS_DIR),
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

    pluginHelpers: {
        OpenInApp: {
            resolveRedirect: (url: string) => invoke<string>(IpcEvents.OPEN_IN_APP__RESOLVE_REDIRECT, url),
        },
        VoiceMessages: {
            readRecording: (path: string) => invoke<Uint8Array | null>(IpcEvents.VOICE_MESSAGES_READ_RECORDING, path),
        }
    }
};
