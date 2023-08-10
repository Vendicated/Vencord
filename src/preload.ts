/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { debounce } from "@utils/debounce";
import { contextBridge, webFrame } from "electron";
import { readFileSync, watch } from "fs";
import { join } from "path";

import VencordNative from "./VencordNative";

contextBridge.exposeInMainWorld("VencordNative", VencordNative);

// Discord
if (location.protocol !== "data:") {
    // #region cssInsert
    const rendererCss = join(__dirname, IS_VENCORD_DESKTOP ? "vencordDesktopRenderer.css" : "renderer.css");

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

    if (IS_DISCORD_DESKTOP) {
        webFrame.executeJavaScript(readFileSync(join(__dirname, "renderer.js"), "utf-8"));
        require(process.env.DISCORD_PRELOAD!);
    }
} // Monaco popout
else {
    contextBridge.exposeInMainWorld("setCss", debounce(VencordNative.quickCss.set));
    contextBridge.exposeInMainWorld("getCurrentCss", VencordNative.quickCss.get);
    // shrug
    contextBridge.exposeInMainWorld("getTheme", () => "vs-dark");
}
