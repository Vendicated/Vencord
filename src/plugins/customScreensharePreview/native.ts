/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readFile } from "node:fs/promises";

import { dialog, IpcMainInvokeEvent } from "electron";

export async function pickFile(_: IpcMainInvokeEvent, title: string, filters: Electron.FileFilter[]): Promise<string | undefined> {
    const res = await dialog.showOpenDialog({ title, filters, properties: ["openFile"] });
    return res.filePaths[0];
}

export async function getFile(_: IpcMainInvokeEvent, path: string, encoding: BufferEncoding): Promise<string> {
    return await readFile(path, encoding);
}
