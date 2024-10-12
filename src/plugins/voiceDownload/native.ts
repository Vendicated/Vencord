/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { ReadableStream } from "node:stream/web";

import { dialog } from "electron";

export async function showDialog() {
    return await dialog.showSaveDialog({
        title: "Save As",
        filters: [{ name: "OGG Files", extensions: ["ogg"] }, { name: "All Files", extensions: ["*"] }],
        defaultPath: "voice-message.ogg",
        buttonLabel: "Save"
    });
}

export async function saveFile(_, path: string, url: string) {
    const { body } = await fetch(url, {
        mode: "no-cors",
    });
    if (!body) return;

    const fileStream = createWriteStream(path, { flags: "wx" });
    await finished(Readable.fromWeb(body as ReadableStream<any>).pipe(fileStream));
}
