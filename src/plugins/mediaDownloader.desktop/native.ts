/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BrowserWindow, dialog, IpcMainInvokeEvent } from "electron";
import { createWriteStream, existsSync, PathLike } from "fs";
import http from "http";
import https from "https";
import { NativeSettings, RendererSettings } from "main/settings";
import path from "path";
import { LiteralUnion } from "type-fest";

function isValidDownloadFolder(dir: string) {
    if (!dir) return false;
    if (dir === "C:\\") return false;
    if (dir.startsWith("/dev")) return false;
    if (dir.startsWith("/bin")) return false;
    // TODO more reasonable safety checks
    return true;
}

export async function selectMediaFolder(event: IpcMainInvokeEvent): Promise<LiteralUnion<"cancelled" | "invalid", string>> {
    const nsettings = NativeSettings.store.plugins?.MediaDownloader;
    const rsettings = RendererSettings.store.plugins?.MediaDownloader;
    const res = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow()!, {
        properties: ["openDirectory"]
    });
    if (!res.filePaths.length) return "cancelled";

    const dir = res.filePaths[0];
    if (!isValidDownloadFolder(dir)) return "invalid";

    // TODO: change this to 'nsettings' when ready
    rsettings.directory = dir;
    return dir;
}

function decorateFileName(baseName: string) {
    return baseName + "_" + Math.random().toString(36).slice(2);
}

function generateFilePath(url: URL, directory: PathLike, backupExtension: string) {

    const sanitizedFilename = path.basename(url.pathname).replace(/([^a-z0-9_\-.() ]+)/, "_");
    const sourceExtension = path.extname(sanitizedFilename);
    const sourceName = path.basename(sanitizedFilename, sourceExtension) || "image";
    const extension = sourceExtension || "." + backupExtension;

    // TODO: expose more filename decoration options
    let fullpath = path.resolve(directory.toLocaleString(), sourceName + extension);

    let maxloops = 99;
    while (existsSync(fullpath) && maxloops--) {
        const tryName = decorateFileName(sourceName);
        fullpath = path.resolve(directory.toLocaleString(), tryName + extension);
    }
    if (maxloops === -1) {
        console.error("No free filename found in 99 attempts");
        return null;
    }

    return fullpath;
}

function chooseProtocol(protocol: string) {
    switch (protocol) {
        case "https:": return https;
        case "http:": return http;
        default: return null;
    }
}

function parseContentType(header: string | undefined) {
    if (!header) return ["unknown", "unknown"];
    const parsed = /^(\w*)\/(\w*)/.exec(header);
    return parsed ?? ["unknown", "unknown"];
}

export function downloadFile(event: IpcMainInvokeEvent, sourceURL: string, proxyURL: string) {
    const rsettings = RendererSettings.store.plugins?.MediaDownloader;
    const nsettings = NativeSettings.store.plugins?.MediaDownloader;
    if (!rsettings || !rsettings.enabled) return Promise.reject("Media downloader plugin is not enabled :?");
    // TODO: change to 'nsettings' when ready
    if (!rsettings || !isValidDownloadFolder(rsettings.directory)) return Promise.reject("A valid downloads folder is not selected!");

    // TODO: more intelligently choose between them
    const url = new URL(rsettings.useProxy ? proxyURL : sourceURL);
    if (!url) return Promise.reject("URL could not be validated!");

    const protocol = chooseProtocol(url.protocol);
    if (!protocol) return Promise.reject("Protocol could not be validated. HTTP or HTTPS only.");

    return new Promise((resolve, reject) => {
        protocol.get(url, function (response) {
            // TODO: handle unusual response codes? redirects? etc.

            const [fileCategory, fileSubtype] = parseContentType(response.headers["content-type"]);
            // TODO: decide if filtering out non-media this way is reliable and/or important
            // if (fileCategory && fileCategory !== "image" && fileCategory !== "video") return false;


            // TODO: change to 'nsettings' when ready
            const outputPath = generateFilePath(url, rsettings.directory, fileSubtype);
            if (!outputPath) {
                reject("Unable to find an available filename to save under. :(");
                return;
            }

            const file = createWriteStream(outputPath).on("error", err => {
                reject("File writing error: " + err);
            }).on("finish", () => {
                resolve("File downloaded to " + outputPath);
            });

            response.pipe(file);

        }).on("error", e => {
            reject(`Error in download: ${e.message}`);
        });
    });
}
