/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RendererSettings } from "@main/settings";
import { app, WebFrameMain, webFrameMain } from "electron";

// TODO: routingID is deprecated and should be replaced with frameToken, but it's too new
const ids = [] as Record<"routingId" | "processId", number>[];

function cleanUpAndGetSpotifyFrames() {
    const spotifyFrames = [] as WebFrameMain[];
    for (let i = ids.length - 1; i >= 0; i--) {
        const { processId, routingId } = ids[i];

        const frame = webFrameMain.fromId(processId, routingId);
        if (!frame) {
            ids.splice(i, 1);
            continue;
        }

        spotifyFrames.push(frame);
    }

    return spotifyFrames;
}

app.on("browser-window-created", (_, win) => {
    win.webContents.on("frame-created", (_, { frame }) => {
        frame?.once("dom-ready", () => {
            if (frame.url.startsWith("https://open.spotify.com/embed/")) {
                cleanUpAndGetSpotifyFrames(); // clean up stale frames

                const { routingId, processId } = frame;
                ids.push({ routingId, processId });

                const settings = RendererSettings.store.plugins?.FixSpotifyEmbeds;
                if (!settings?.enabled) return;

                frame.executeJavaScript(`
                    globalThis._vcVolume = ${settings.volume / 100};
                    const original = Audio.prototype.play;
                    Audio.prototype.play = function() {
                        this.volume = _vcVolume;
                        return original.apply(this, arguments);
                    }
                `);
            }
        });
    });

    RendererSettings.addChangeListener("plugins.FixSpotifyEmbeds.volume", newVolume => {
        try {
            cleanUpAndGetSpotifyFrames().forEach(frame =>
                frame.executeJavaScript(`globalThis._vcVolume = ${newVolume / 100}`)
            );
        } catch (e) {
            console.error("FixSpotifyEmbeds: Failed to update volume", e);
        }
    });
});
