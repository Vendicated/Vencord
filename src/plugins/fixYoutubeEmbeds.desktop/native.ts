/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NativeSettings, RendererSettings } from "@main/settings";
import { app, BrowserWindow, WebFrameMain } from "electron";

app.on("browser-window-created", (_, window) => {
    window.webContents.on("frame-created", (_, { frame: frame }) => {
        if (!RendererSettings.store.plugins?.FixYoutubeEmbeds?.enabled) return;

        ensureCSPRulesExist();
        modifyIframeSrcAttributes(window);
        frame?.once("dom-ready", () => {
            reloadFrameOnError(frame);
        });
    });
});

function ensureCSPRulesExist() {
    const yt_domain = new URL("https://*.youtube-nocookie.com/").hostname;
    const required_csp_directives = ["frame-src"];

    const current_rules = NativeSettings.store.customCspRules[yt_domain];

    if (!required_csp_directives.every(directive => current_rules.includes(directive))) {
        const new_unique_rules = new Set(...current_rules, ...required_csp_directives);
        NativeSettings.store.customCspRules[yt_domain] = [...new_unique_rules];
    }
}

function modifyIframeSrcAttributes(window: BrowserWindow) {

    const youtubeVideoIdPattern: RegExp = /(?:youtube(?:-nocookie)?\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

    window.webContents.executeJavaScript(`
        new MutationObserver(() => {
            document.querySelectorAll('iframe').forEach(iframe => {
                if (iframe.src && iframe.src.startsWith("https://www.youtube.com/")) {
                    const pattern_match = iframe.src.match(${youtubeVideoIdPattern});
                    if (pattern_match && pattern_match.length >= 2) {
                        const video_id = pattern_match[1];
                        const params = new URL(iframe.src).search;
                        iframe.src = "https://www.youtube-nocookie.com/embed/" + video_id + params;
                    }
                }
            });
        }).observe(document.body, { childList: true, subtree:true });
    `);
}

function reloadFrameOnError(frame: WebFrameMain) {
    if (frame.url.startsWith("https://www.youtube.com/") || frame.url.startsWith("https://www.youtube-nocookie.com/")) {
        frame.executeJavaScript(`
            new MutationObserver(() => {
                if (document.querySelector('div.ytp-error-content-wrap-subreason a[href*="www.youtube.com/watch?v="]')) {
                    // Reload if we see the UMG style block
                    location.reload();
                }
                if (document.querySelector('div.ytp-error-content-wrap-reason span')) {
                    // Attempt to reload if we see a generic error (may solve "please sign in" error but usually does not)
                    location.reload();
                }
            }).observe(document.body, { childList: true, subtree: true });
        `);
    }
}
