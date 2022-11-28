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

import { debounce } from "@utils/debounce";
import IpcEvents from "@utils/IpcEvents";
import electron, { contextBridge, ipcRenderer, webFrame } from "electron";
import { readFileSync } from "fs";
import { join } from "path";

import VencordNative from "./VencordNative";

if (electron.desktopCapturer === void 0) {
    // Fix for desktopCapturer being main only in Electron 17+
    // Discord accesses this in discord_desktop_core (DiscordNative.desktopCapture.getDesktopCaptureSources)
    // and errors with cannot "read property getSources() of undefined"
    // see discord_desktop_core/app/discord_native/renderer/desktopCapture.js
    const electronPath = require.resolve("electron");
    delete require.cache[electronPath]!.exports;
    require.cache[electronPath]!.exports = {
        ...electron,
        desktopCapturer: {
            getSources: opts => ipcRenderer.invoke(IpcEvents.GET_DESKTOP_CAPTURE_SOURCES, opts)
        }
    };
}

contextBridge.exposeInMainWorld("VencordNative", VencordNative);

if (location.protocol !== "data:") {
    // Discord
    webFrame.executeJavaScript(readFileSync(join(__dirname, "renderer.js"), "utf-8"));
    const rendererCss = join(__dirname, "renderer.css");
    try {
        const css = readFileSync(rendererCss, "utf-8");
        webFrame.insertCSS(css);
    } catch (err) {
        if ((err as NodeJS.ErrnoException)?.code !== "ENOENT")
            throw err;

        // hack: the pre update updater does not download this file, so manually download it
        // TODO: remove this in a future version
        ipcRenderer.invoke(IpcEvents.DOWNLOAD_VENCORD_CSS)
            .then(css => webFrame.insertCSS(css));
    }
    require(process.env.DISCORD_PRELOAD!);
} else {
    // Monaco Popout
    contextBridge.exposeInMainWorld("setCss", debounce(s => VencordNative.ipc.invoke(IpcEvents.SET_QUICK_CSS, s)));
    contextBridge.exposeInMainWorld("getCurrentCss", () => VencordNative.ipc.invoke(IpcEvents.GET_QUICK_CSS));
    // shrug
    contextBridge.exposeInMainWorld("getTheme", () => "vs-dark");
}
