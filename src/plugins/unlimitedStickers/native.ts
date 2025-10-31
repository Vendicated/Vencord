/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 chev
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type Dirent, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dialog, type IpcMainInvokeEvent } from "electron";

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

export const getStickerFiles = (
    _: IpcMainInvokeEvent,
    stickerPath: string,
): StickerResponse => {
    if (!stickerPath) return { categories: [] };

    try {
        const rootDirents = readdirSync(stickerPath, { withFileTypes: true });
        const categoryFolders = rootDirents.filter((dirent) =>
            dirent.isDirectory(),
        );

        if (categoryFolders.length === 0) {
            const debugMessage = `[UnlimitedStickers] No category subfolders found in path: ${stickerPath}. Please organize your stickers into subfolders.`;
            console.warn(debugMessage);
            return { categories: [], debug: debugMessage };
        }

        const categories: StickerCategory[] = categoryFolders
            .map((categoryDir) => {
                const categoryPath = resolve(stickerPath, categoryDir.name);
                const stickerDirents = readdirSync(categoryPath, {
                    withFileTypes: true,
                });

                const files = stickerDirents
                    .filter(stickerFilter)
                    .map((fileDirent) => ({
                        name: fileDirent.name.replace(/\.(png|apng|gif|jpe?g)$/i, ""),
                        path: resolve(categoryPath, fileDirent.name),
                    }));

                return { name: categoryDir.name, files };
            })
            .filter((category) => category.files.length > 0);

        if (categories.length === 0) {
            const debugMessage = `[UnlimitedStickers] No valid sticker files (.png, .apng, .gif, .jpg, .jpeg) found in any subfolders of: ${stickerPath}.`;
            console.warn(debugMessage);
            return { categories: [], debug: debugMessage };
        }

        return { categories };
    } catch (e) {
        console.error(
            `[UnlimitedStickers] Failed to read sticker directory at path: ${stickerPath}`,
            e,
        );
        throw e;
    }
};

export const getFileAsBase64 = (_, path: string): string | null => {
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
        console.error(
            `[UnlimitedStickers] Failed to read file for Base64 conversion: ${path}`,
            e,
        );
        return null;
    }
};

export const selectStickerDirectory = async (
    _: IpcMainInvokeEvent,
): Promise<string | null> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "Select Your Stickers Folder",
        properties: ["openDirectory"],
    });

    if (canceled || filePaths.length === 0) {
        return null;
    }

    return filePaths[0];
};