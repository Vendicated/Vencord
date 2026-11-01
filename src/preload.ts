/*
 * Claudecord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated, Claude and contributors
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

import { debounce } from "@shared/debounce";
import { IpcEvents } from "@shared/IpcEvents";
import { contextBridge, webFrame } from "electron/renderer";

import ClaudecordNative, { invoke, sendSync } from "./ClaudecordNative";

contextBridge.exposeInMainWorld("ClaudecordNative", ClaudecordNative);

// Monaco popout
if (location.href === DESKTOP_MONACO_EDITOR_URL) {
    contextBridge.exposeInMainWorld("setCss", debounce(ClaudecordNative.quickCss.set));
    contextBridge.exposeInMainWorld("getCurrentCss", ClaudecordNative.quickCss.get);
    contextBridge.exposeInMainWorld("getTheme", ClaudecordNative.quickCss.getEditorTheme);
}
// Discord
else {
    invoke(IpcEvents.INIT_FILE_WATCHERS);

    if (IS_DISCORD_DESKTOP) {
        webFrame.executeJavaScript(sendSync<string>(IpcEvents.PRELOAD_GET_RENDERER_JS));
        // Not supported in sandboxed preload scripts but Discord doesn't support it either so who cares
        require(process.env.DISCORD_PRELOAD!);
    }
}
