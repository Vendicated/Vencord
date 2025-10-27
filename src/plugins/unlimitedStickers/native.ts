/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 chev
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";
import { Dirent, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface StickerFile {
    name: string;
    path: string;
}

interface StickerCategory {
    name: string;
    files: StickerFile[];
}

interface StickerResponse {
    categories: StickerCategory[];
    debug?: string;
}

const stickerFilter = (dirent: Dirent) =>
    dirent.isFile() && /\.(png|apng|gif|jpe?g)$/i.test(dirent.name);

/**
 * Lists all valid sticker files in subdirectories of the provided folder path.
 * This is now called with the path from the plugin's settings.
 * @param _ Unused IPC event from Vencord Native.
 * @param stickerPath The absolute path to the root sticker folder.
 * @returns An object containing the categorized sticker files.
 */
export function getStickerFiles(_: IpcMainInvokeEvent, stickerPath: string): StickerResponse {
    if (!stickerPath) return { categories: [] };

    try {
        const rootDirents = readdirSync(stickerPath, { withFileTypes: true });
        const categoryFolders = rootDirents.filter(dirent => dirent.isDirectory());

        if (categoryFolders.length === 0) {
            const debugMessage = `[UnlimitedStickers] No category subfolders found in path: ${stickerPath}. Please organize your stickers into subfolders.`;
            console.warn(debugMessage);
            return { categories: [], debug: debugMessage };
        }

        const categories: StickerCategory[] = categoryFolders.map(categoryDir => {
            const categoryPath = resolve(stickerPath, categoryDir.name);
            const stickerDirents = readdirSync(categoryPath, { withFileTypes: true });

            const files = stickerDirents
                .filter(stickerFilter)
                .map(fileDirent => ({
                    name: fileDirent.name.replace(/\.(png|apng|gif|jpe?g)$/i, ""),
                    path: resolve(categoryPath, fileDirent.name)
                }));

            return { name: categoryDir.name, files };
        }).filter(category => category.files.length > 0);

        if (categories.length === 0) {
            const debugMessage = `[UnlimitedStickers] No valid sticker files (.png, .apng, .gif, .jpg, .jpeg) found in any subfolders of: ${stickerPath}.`;
            console.warn(debugMessage);
            return { categories: [], debug: debugMessage };
        }

        return { categories };
    } catch (e) {
        console.error(`[UnlimitedStickers] Failed to read sticker directory at path: ${stickerPath}`, e);
        throw e;
    }
}

/**
 * Reads a file and converts its content to a Base64 encoded data URL.
 * @param _ Unused IPC event from Vencord Native.
 * @param path The absolute path to the file.
 * @returns A base64 data URL string, or null if reading fails.
 */
export function getFileAsBase64(_, path: string): string | null {
    try {
        const fileContent = readFileSync(path);
        const lowerPath = path.toLowerCase();
        let mimeType: string;

        if (lowerPath.endsWith(".apng")) {
            mimeType = "image/apng";
        } else if (lowerPath.endsWith(".gif")) {
            mimeType = "image/gif";
        } else if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
            mimeType = "image/jpeg";
        } else {
            mimeType = "image/png";
        }

        return `data:${mimeType};base64,${fileContent.toString("base64")}`;
    } catch (e) {
        console.error(`[UnlimitedStickers] Failed to read file for Base64 conversion: ${path}`, e);
        return null;
    }
}