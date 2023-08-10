/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcEvents } from "@utils/IpcEvents";
import { app, ipcMain } from "electron";
import { readFile } from "fs/promises";
import { request } from "https";
import { basename, normalize } from "path";

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
