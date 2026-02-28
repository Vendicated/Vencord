/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RendererSettings } from "@main/settings";
import { app } from "electron";
import sponsorLogic from "file://sponsorLogic.js?minify";

app.on("browser-window-created", (_, win) => {
    win.webContents.on("frame-created", (_, { frame }) => {
        frame?.once("dom-ready", () => {
            if (frame.isDestroyed()) return;

            const isEnabled = RendererSettings.store.plugins?.SponsorBlock?.enabled;
            if (!isEnabled) return;

            if (frame.url.includes("youtube.com/embed/")) {
                frame.executeJavaScript(`
                    (function() {
                        if (window.SB_LOADED) return;
                        window.SB_LOADED = true;
                        ${sponsorLogic}
                    })();
                `).catch(console.error);
            }
        });
    });
});
