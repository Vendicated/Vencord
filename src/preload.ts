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
import { contextBridge, webFrame } from "electron";
import { readFileSync, watch } from "fs";
import { join } from "path";

import VencordNative from "./VencordNative";

// Expose VencordNative in the main world
contextBridge.exposeInMainWorld("VencordNative", VencordNative);

// Discord
if (location.protocol !== "data:") {
    // #region cssInsert
    const rendererCss = join(__dirname, IS_VESKTOP ? "vencordDesktopRenderer.css" : "renderer.css");
    
    // Create and append style element
    const style = document.createElement("style");
    style.id = "vencord-css-core";
    style.textContent = readFileSync(rendererCss, "utf-8");
    
    // Append style element to the document when ready
    const appendStyleToDocument = () => document.documentElement.appendChild(style);

    if (document.readyState === "complete") {
        appendStyleToDocument();
    } else {
        document.addEventListener("DOMContentLoaded", appendStyleToDocument, { once: true });
    }

    if (IS_DEV) {
        // Watch for changes in rendererCss and update style accordingly
        watch(rendererCss, { persistent: false }, () => {
            const coreStyleElement = document.getElementById("vencord-css-core");
            if (coreStyleElement) {
                coreStyleElement.textContent = readFileSync(rendererCss, "utf-8");
            }
        });
    }
    // #endregion

    if (IS_DISCORD_DESKTOP) {
        // Execute JavaScript and require preload in Discord desktop environment
        webFrame.executeJavaScript(readFileSync(join(__dirname, "renderer.js"), "utf-8"));
        require(process.env.DISCORD_PRELOAD!);
    }
} else {
    // Monaco popout
    contextBridge.exposeInMainWorld("setCss", debounce(VencordNative.quickCss.set));
    contextBridge.exposeInMainWorld("getCurrentCss", VencordNative.quickCss.get);
    // shrug
    contextBridge.exposeInMainWorld("getTheme", () => "vs-dark");
}

