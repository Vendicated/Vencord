/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RendererSettings } from "@main/settings";
import { app } from "electron";
import { Logger } from "@utils/Logger";
// @ts-ignore
import sponsorLogic from "file://sponsorLogic.js?minify";
const logger = new Logger("SponsorBlock");

app.on("browser-window-created", (_, win) => {
    win.webContents.on("frame-created", (_, { frame }) => {
        if (!frame) return;

        frame.once("dom-ready", () => {
            if (!frame || frame.isDestroyed()) return;

            const isEnabled = RendererSettings.store.plugins?.SponsorBlock?.enabled;
            if (!isEnabled) return;

            if (frame.url.includes("youtube.com/embed/")) {
                frame.executeJavaScript(`
                    (function() {
                        if (window.SB_LOADED) return;
                        window.SB_LOADED = true;
                        ${sponsorLogic}
                    })();
                `).catch(err => logger.error("Injection failed", err));
            }
        });
    });
});
