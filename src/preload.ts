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

import { IpcEvents } from "@shared/IpcEvents";
import { contextBridge, webFrame } from "electron/renderer";

import VencordNative, { invoke, sendSync } from "./VencordNative";

function debounceWithFlush<T extends (...args: any[]) => unknown>(func: T, delay = 300) {
    let timeout: NodeJS.Timeout | undefined;
    let lastArgs: Parameters<T> | undefined;

    function flush() {
        if (!timeout) return;

        clearTimeout(timeout);
        timeout = undefined;
        func(...lastArgs!);
        lastArgs = undefined;
    }

    function debounced(...args: Parameters<T>) {
        lastArgs = args;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = undefined;
            func(...args);
            lastArgs = undefined;
        }, delay);
    }

    debounced.flush = flush;
    return debounced;
}

contextBridge.exposeInMainWorld("VencordNative", VencordNative);

// Discord
if (location.protocol !== "data:") {
    invoke(IpcEvents.INIT_FILE_WATCHERS);

    if (IS_DISCORD_DESKTOP) {
        webFrame.executeJavaScript(sendSync<string>(IpcEvents.PRELOAD_GET_RENDERER_JS));
        // Not supported in sandboxed preload scripts but Discord doesn't support it either so who cares
        require(process.env.DISCORD_PRELOAD!);
    }
} // Monaco popout
else {
    const setContent = debounceWithFlush((content: string) => invoke(IpcEvents.SET_MONACO_EDITOR_CONTENT, content));
    window.addEventListener("beforeunload", setContent.flush);

    contextBridge.exposeInMainWorld("setContent", setContent);
    contextBridge.exposeInMainWorld("getCurrentContent", () => invoke<string>(IpcEvents.GET_MONACO_EDITOR_CONTENT));
    contextBridge.exposeInMainWorld("getLanguage", () => invoke<string>(IpcEvents.GET_MONACO_EDITOR_LANGUAGE));
    contextBridge.exposeInMainWorld("getTitle", () => invoke<string>(IpcEvents.GET_MONACO_EDITOR_TITLE));
    contextBridge.exposeInMainWorld("getTheme", VencordNative.quickCss.getEditorTheme);
}
