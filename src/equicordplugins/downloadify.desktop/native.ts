/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { dialog } from "electron";
import fs from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";

/**
 * Check if a file exists at a given path.
 */
export async function fileExists(_: Electron.IpcMainInvokeEvent, filePath: string): Promise<boolean> {
    try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Ask the user to select a directory to save files.
 */
export async function getDirectory(_: Electron.IpcMainInvokeEvent): Promise<string | null> {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"]
    });

    return result.filePaths[0] ?? null;
}

/**
 * Ask the user to select a file name and location to save a file.
 */
export async function getFilePath(_: Electron.IpcMainInvokeEvent, fileName: string, fileTypes: string[] | null): Promise<string | null> {
    const filters = fileTypes?.map(ext => ({
        name: ext.toUpperCase(),
        extensions: [ext]
    })) ?? [];

    if (!fileTypes?.length) {
        filters.push({ name: "All Files", extensions: ["*"] });
    }

    const result = await dialog.showSaveDialog({
        title: "Save File",
        defaultPath: fileName,
        buttonLabel: "Save",
        properties: ["createDirectory"],
        filters
    });

    return result.filePath ?? null;
}

/**
 * Get the content type of a file at a URL.
 *
 * @returns The content type of the file if it exists, undefined if no content type is available, or null if the file doesn't exist.
 */
export async function queryURL(_: Electron.IpcMainInvokeEvent, url: string): Promise<string | null | undefined> {
    const response = await fetch(url, { method: "HEAD" });

    if (!response.ok) {
        return null;
    }

    return response.headers.get("content-type") ?? undefined;
}

/**
 * Download a file from a URL to a local file path.
 */
export async function downloadURL(_: Electron.IpcMainInvokeEvent, url: string, filePath: string): Promise<boolean> {
    const response = await fetch(url);

    if (!response.ok) {
        return false;
    }

    if (!response.body) {
        return false;
    }

    const readableStream = Readable.fromWeb(response.body as any);
    const fileWriteStream = fs.createWriteStream(filePath);
    readableStream.pipe(fileWriteStream);
    await finished(fileWriteStream);

    return true;
}
