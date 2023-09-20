/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { IpcEvents } from "@utils/IpcEvents";
import { app, ipcMain } from "electron";
import { readFile } from "fs/promises";
import { request } from "https";
import { basename, normalize } from "path";

import { getSettings } from "./ipcMain";
import { AdGuardBlockScript } from "./utils/adGuardBlockScript";

app.on("browser-window-created", (_, win) => {
    win.webContents.on("frame-created", (_, { frame }) => {
        frame.once("dom-ready", () => {
            // FixSpotifyEmbeds
            if (frame.url.startsWith("https://open.spotify.com/embed/")) {
                const settings = getSettings().plugins?.FixSpotifyEmbeds;

                if (settings?.enabled) {
                    frame.executeJavaScript(`
                        const original = Audio.prototype.play;
                        Audio.prototype.play = function() {
                            this.volume = ${(settings.volume / 100) || 0.1};
                            return original.apply(this, arguments);
                        }
                    `);
                }
            }

            // WatchTogetherActivityAdblock
            if (frame.url.startsWith("https://www.youtube.com/")) {
                const settings = getSettings().plugins?.WatchTogetherActivityAdblock;

                if (settings?.enabled) {
                    frame.executeJavaScript(AdGuardBlockScript);
                }
            }
        });
    });
});

// #region OpenInApp
// These links don't support CORS, so this has to be native
const validRedirectUrls = /^https:\/\/(spotify\.link|s\.team)\/.+$/;

function getRedirect(url: string) {
    return new Promise<string>((resolve, reject) => {
        const req = request(new URL(url), { method: "HEAD" }, res => {
            resolve(
                res.headers.location
                    ? getRedirect(res.headers.location)
                    : url
            );
        });
        req.on("error", reject);
        req.end();
    });
}

ipcMain.handle(IpcEvents.OPEN_IN_APP__RESOLVE_REDIRECT, async (_, url: string) => {
    if (!validRedirectUrls.test(url)) return url;

    return getRedirect(url);
});
// #endregion


// #region VoiceMessages
ipcMain.handle(IpcEvents.VOICE_MESSAGES_READ_RECORDING, async (_, filePath: string) => {
    filePath = normalize(filePath);
    const filename = basename(filePath);
    const discordBaseDirWithTrailingSlash = normalize(app.getPath("userData") + "/");
    console.log(filename, discordBaseDirWithTrailingSlash, filePath);
    if (filename !== "recording.ogg" || !filePath.startsWith(discordBaseDirWithTrailingSlash)) return null;

    try {
        const buf = await readFile(filePath);
        return new Uint8Array(buf.buffer);
    } catch {
        return null;
    }
});

// #endregion
