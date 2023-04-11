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
import { contextBridge, webFrame } from "electron";
import { readFileSync, watch } from "fs";
import { join } from "path";

import VencordNative from "./VencordNative";

contextBridge.exposeInMainWorld("VencordNative", VencordNative);

// Discord
if (location.protocol !== "data:") {
    // #region cssInsert
    const rendererCss = join(__dirname, "renderer.css");

    const style = document.createElement("style");
    style.id = "vencord-css-core";
    style.textContent = readFileSync(rendererCss, "utf-8");

    if (document.readyState === "complete") {
        document.documentElement.appendChild(style);
    } else {
        document.addEventListener("DOMContentLoaded", () => document.documentElement.appendChild(style), {
            once: true
        });
    }

    if (IS_DEV) {
        // persistent means keep process running if watcher is the only thing still running
        // which we obviously don't want
        watch(rendererCss, { persistent: false }, () => {
            document.getElementById("vencord-css-core")!.textContent = readFileSync(rendererCss, "utf-8");
        });
    }
    // #endregion

    if (process.env.DISCORD_PRELOAD) {
        webFrame.executeJavaScript(readFileSync(join(__dirname, "renderer.js"), "utf-8"));
        require(process.env.DISCORD_PRELOAD);
    }
} // Monaco popout
else {
    contextBridge.exposeInMainWorld("setCss", debounce(s => VencordNative.ipc.invoke(IpcEvents.SET_QUICK_CSS, s)));
    contextBridge.exposeInMainWorld("getCurrentCss", () => VencordNative.ipc.invoke(IpcEvents.GET_QUICK_CSS));
    // shrug
    contextBridge.exposeInMainWorld("getTheme", () => "vs-dark");
}
