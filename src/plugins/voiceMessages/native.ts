/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";
import { readFile } from "fs/promises";
import { basename, normalize } from "path";

export async function readRecording(_, filePath: string) {
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
}
