/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RendererSettings } from "@main/settings";
import { Logger } from "@utils/Logger";
import { app, BrowserWindow, WebFrameMain } from "electron";

const fixYoutubeEmbedsLogger = new Logger("FixYoutubeEmbeds");

app.on("browser-window-created", (_, window) => {
    window.webContents.on("frame-created", (_, { frame: frame }) => {
        const pluginSettings = RendererSettings.store.plugins;
        const pluginDisabled = (pluginSettings === undefined || pluginSettings.FixYoutubeEmbeds === undefined || !pluginSettings.FixYoutubeEmbeds.enabled);

        if (pluginDisabled) return;

        if (frame == null) {
            fixYoutubeEmbedsLogger.error("Unable to acquire non-null window and/or frame from respective Electron creation callbacks");
            return;
        }

        overrideIframeSource(window);
        frame.once("dom-ready", () => {
            reloadFrameLocation(frame);
        });
    });
});

function overrideIframeSource(
    window: BrowserWindow,
    videoIDPattern: RegExp = /(?:youtube(?:-nocookie)?\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
) {
    window.webContents.executeJavaScript(`
        new MutationObserver(() => {
            document.querySelectorAll("iframe").forEach(iframe => {
                if (iframe.src.startsWith("https://www.youtube.com/embed/")) {
                    const video_id = iframe.src.match(${videoIDPattern})[1];
                    const params = new URL(iframe.src).search + "&app=mobile";
                    iframe.src = "https://www.youtube-nocookie.com/embed/" + video_id + params;
                }
            });
        }).observe(document.body, { childList: true, subtree:true });
    `);
}

function reloadFrameLocation(frame: WebFrameMain) {
    if (frame.url.startsWith("https://www.youtube.com/") || frame.url.startsWith("https://www.youtube-nocookie.com/")) {
        frame.executeJavaScript(`;
            new MutationObserver(() => {
                if (document.querySelector('div.ytp-error-content-wrap-subreason a[href*="www.youtube.com/watch?v="]')) {
                    // Reload if we see the UMG style block
                    location.reload();
                }
                if (document.querySelector('div.ytp-error-content-wrap-reason span')) {
                    // Attempt to reload if we see the bot "please sign in" error
                    location.reload();
                }
            }).observe(document.body, { childList: true, subtree: true });
        `);
    }
}
