/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { DATA_DIR } from "@main/utils/constants";
import { dialog, IpcMainInvokeEvent, shell } from "electron";

import { getSettings, saveSettings } from "./settings";
export * from "./updater";

import { LoggedAttachment } from "../types";
import { LOGS_DATA_FILENAME } from "../utils/constants";
import { ensureDirectoryExists, getAttachmentIdFromFilename, sleep } from "./utils";

export { getSettings };

// so we can filter the native helpers by this key
export function messageLoggerEnhancedUniqueIdThingyIdkMan() { }

// Map<attachmetId, path>()
const nativeSavedImages = new Map<string, string>();
export const getNativeSavedImages = () => nativeSavedImages;

let logsDir: string;
let imageCacheDir: string;

const getImageCacheDir = async () => imageCacheDir ?? await getDefaultNativeImageDir();
const getLogsDir = async () => logsDir ?? await getDefaultNativeDataDir();



export async function initDirs() {
    const { logsDir: ld, imageCacheDir: icd } = await getSettings();

    logsDir = ld || await getDefaultNativeDataDir();
    imageCacheDir = icd || await getDefaultNativeImageDir();
}
initDirs();

export async function init(_event: IpcMainInvokeEvent) {
    const imageDir = await getImageCacheDir();

    await ensureDirectoryExists(imageDir);
    const files = await readdir(imageDir);
    for (const filename of files) {
        const attachmentId = getAttachmentIdFromFilename(filename);
        nativeSavedImages.set(attachmentId, path.join(imageDir, filename));
    }
}

export async function getImageNative(_event: IpcMainInvokeEvent, attachmentId: string): Promise<Uint8Array | Buffer | null> {
    const imagePath = nativeSavedImages.get(attachmentId);
    if (!imagePath) return null;

    try {
        return await readFile(imagePath);
    } catch (error: any) {
        console.error(error);
        return null;
    }
}

export async function writeImageNative(_event: IpcMainInvokeEvent, filename: string, content: Uint8Array) {
    if (!filename || !content) return;
    const imageDir = await getImageCacheDir();

    // returns the file name
    // ../../someMalicousPath.png -> someMalicousPath
    const attachmentId = getAttachmentIdFromFilename(filename);

    const existingImage = nativeSavedImages.get(attachmentId);
    if (existingImage) return;

    const imagePath = path.join(imageDir, filename);
    await ensureDirectoryExists(imageDir);
    await writeFile(imagePath, content);

    nativeSavedImages.set(attachmentId, imagePath);
}

export async function deleteFileNative(_event: IpcMainInvokeEvent, attachmentId: string) {
    const imagePath = nativeSavedImages.get(attachmentId);
    if (!imagePath) return;

    await unlink(imagePath);
}


export async function writeLogs(_event: IpcMainInvokeEvent, contents: string) {
    const logsDir = await getLogsDir();

    writeFile(path.join(logsDir, LOGS_DATA_FILENAME), contents);
}


export async function getDefaultNativeImageDir(): Promise<string> {
    return path.join(await getDefaultNativeDataDir(), "savedImages");
}

export async function getDefaultNativeDataDir(): Promise<string> {
    return path.join(DATA_DIR, "MessageLoggerData");
}

export async function chooseDir(event: IpcMainInvokeEvent, logKey: "logsDir" | "imageCacheDir") {
    const settings = await getSettings();
    const defaultPath = settings[logKey] || await getDefaultNativeDataDir();

    const res = await dialog.showOpenDialog({ properties: ["openDirectory"], defaultPath: defaultPath });
    const dir = res.filePaths[0];

    if (!dir) throw Error("Invalid Directory");

    settings[logKey] = dir;

    await saveSettings(settings);

    switch (logKey) {
        case "logsDir": logsDir = dir; break;
        case "imageCacheDir": imageCacheDir = dir; break;
    }

    if (logKey === "imageCacheDir")
        await init(event);

    return dir;
}

export async function showItemInFolder(_event: IpcMainInvokeEvent, filePath: string) {
    shell.showItemInFolder(filePath);
}

export async function chooseFile(_event: IpcMainInvokeEvent, title: string, filters: Electron.FileFilter[], defaultPath?: string) {
    const res = await dialog.showOpenDialog({ title, filters, properties: ["openFile"], defaultPath });
    const [path] = res.filePaths;

    if (!path) throw Error("Invalid file");

    return await readFile(path, "utf-8");
}

// doing it in native because you can only fetch images from the renderer
// other types of files will cause cors issues
export async function downloadAttachment(_event: IpcMainInvokeEvent, attachemnt: LoggedAttachment, attempts = 0, useOldUrl = false): Promise<{ error: string | null; path: string | null; }> {
    try {
        if (!attachemnt?.url || !attachemnt.oldUrl || !attachemnt?.id || !attachemnt?.fileExtension)
            return { error: "Invalid Attachment", path: null };

        if (attachemnt.id.match(/[\\/.]/)) {
            return { error: "Invalid Attachment ID", path: null };
        }

        const existingImage = nativeSavedImages.get(attachemnt.id);
        if (existingImage)
            return {
                error: null,
                path: existingImage
            };

        const res = await fetch(useOldUrl ? attachemnt.oldUrl : attachemnt.url);

        if (res.status !== 200) {
            if (res.status === 404 || res.status === 403 || res.status === 415)
                useOldUrl = true;

            attempts++;
            if (attempts > 3) {
                return {
                    error: `Failed to get attachment ${attachemnt.id} for caching. too many attempts, error code ${res.status}`,
                    path: null,
                };
            }

            await sleep(1000);
            return downloadAttachment(_event, attachemnt, attempts, useOldUrl);
        }

        const ab = await res.arrayBuffer();
        const imageCacheDir = await getImageCacheDir();
        await ensureDirectoryExists(imageCacheDir);

        const finalPath = path.join(imageCacheDir, `${attachemnt.id}${attachemnt.fileExtension}`);
        await writeFile(finalPath, Buffer.from(ab));

        nativeSavedImages.set(attachemnt.id, finalPath);

        return {
            error: null,
            path: finalPath
        };

    } catch (error: any) {
        console.error(error);
        return { error: error.message, path: null };
    }
}
