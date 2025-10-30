/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RendererSettings } from "@main/settings";
import { Logger } from "@utils/Logger";
import { app } from "electron";
import adguard from "file://adguard.js?minify";

app.on("browser-window-created", (_, win) => {
    win.webContents.on("frame-created", (_, { frame }) => {
        frame?.once("dom-ready", () => {
            if (!RendererSettings.store.plugins?.YoutubeAdblock?.enabled) return;

            for (const context of [frame, frame.parent]) {
                if (context !== null) {
                    for (const domain of ["youtube.com/embed/", "youtube-nocookie.com/embed/"]) {
                        if (context.url.includes(domain) && typeof hiddenCSS === "undefined") {
                            context.executeJavaScript(
                                `
                            if(typeof hiddenCSS === "undefined"){
                                ${adguard}
                            }
                            `);
                            return;
                        }
                    }
                }
            }

            new Logger("YoutubeAdblock").error("Unable to load adguard script");
        });
    });
});
