/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RendererSettings } from "@main/settings";
import { app, WebFrameMain } from "electron";
import adguard from "file://adguard.js?minify";

app.on("browser-window-created", (_, win) => {
    let watchTogetherFrame: WebFrameMain | null = null;
    win.webContents.on("frame-created", (_, { frame }) => {
        frame?.once("dom-ready", () => {
            if (!RendererSettings.store.plugins?.YoutubeAdblock?.enabled)
                return;

            if (frame.url.includes("youtube.com/embed")) { // regular embed in a message
                frame.executeJavaScript(adguard);
            } else if (frame.url.includes("880218394199220334.discordsays.com/")) {
                watchTogetherFrame = frame;
            } else if (watchTogetherFrame && frame.top?.frames.includes(watchTogetherFrame)) {
                const youtubeEmbed = watchTogetherFrame.frames.find(frame => frame.url.includes("youtube.com/embed/"));
                // @ts-ignore we use this property to not execute javascript on the same frame again
                if (youtubeEmbed !== undefined && youtubeEmbed.executed === undefined) {
                    // @ts-ignore we use this property to not execute javascript on the same frame again
                    youtubeEmbed.executed = true;
                    youtubeEmbed.executeJavaScript(adguard);
                }
            }
        });
    });
});
