/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RendererSettings } from "@main/settings";
import { app, webFrameMain } from "electron";
import adguard from "file://adblock-runtime.ts?minify";

app.on("browser-window-created", (_, win) => {
    win.webContents.on("did-frame-navigate", (_event, _url, _httpResponseCose, _httpStatusText, _isMainFrame, frameProcessid, frameRoutingId) => {
        if (!RendererSettings.store.plugins?.YoutubeAdblock?.enabled) return;

        const frame = webFrameMain.fromId(frameProcessid, frameRoutingId);
        if (!frame) return;

        if (frame.url.includes("youtube.com/embed/") || (frame.url.includes("discordsays") && frame.url.includes("youtube.com"))) {
            frame.executeJavaScript(adguard);
        }
    });
});
