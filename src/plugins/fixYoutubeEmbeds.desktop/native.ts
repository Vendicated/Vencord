/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";
import { getSettings } from "main/ipcMain";

app.on("browser-window-created", (_, win) => {
    win.webContents.on("frame-created", (_, { frame }) => {
        frame.once("dom-ready", () => {
            if (frame.url.startsWith("https://www.youtube.com/")) {
                const settings = getSettings().plugins?.FixYoutubeEmbeds;
                if (!settings?.enabled) return;

                frame.executeJavaScript(`
                new MutationObserver(() => {
                    let err = document.querySelector(".ytp-error-content-wrap-subreason span")?.textContent;
                    if (err && err.includes("blocked it from display")) window.location.reload()
                }).observe(document.body, { childList: true, subtree:true });
                `);
            }
        });
    });
});
