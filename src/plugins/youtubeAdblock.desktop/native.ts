/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RendererSettings } from "@main/settings";
import { app } from "electron";
import adguard from "file://adguard.js?minify";

app.on("browser-window-created", (_, win) => {
    win.webContents.on("frame-created", (_, { frame }) => {
        frame?.once("dom-ready", () => {
            if (!RendererSettings.store.plugins?.YoutubeAdblock?.enabled) return;

            if (frame.url.includes("youtube.com/embed/")) {
                frame.executeJavaScript(adguard);
            } else if (frame.parent?.url.includes("youtube.com/embed/")) {
                frame.parent.executeJavaScript(adguard);
            }
        });
    });
});
