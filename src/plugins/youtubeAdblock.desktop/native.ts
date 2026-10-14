/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RendererSettings } from "@main/settings";
import { app, WebFrameMain, webFrameMain } from "electron";
import adguard from "file://adguard.js?minify";

function inject(frame: WebFrameMain | null | undefined) {
    if (!frame || !RendererSettings.store.plugins?.YoutubeAdblock?.enabled) return;

    try {
        if (!/^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\//.test(frame.url)) return;

        frame.executeJavaScript(adguard).catch(e => {
            console.error("YoutubeAdblock: Failed to inject", e);
        });
    } catch (e) {
        console.error("YoutubeAdblock: Failed to access frame", e);
    }
}

app.on("web-contents-created", (_, contents) => {
    contents.on("did-frame-navigate", (_, _url, _code, _status, _main, processId, routingId) => {
        inject(webFrameMain.fromId(processId, routingId));
    });
    contents.on("frame-created", (_, { frame }) => {
        frame?.on("dom-ready", () => inject(frame));
    });
});
