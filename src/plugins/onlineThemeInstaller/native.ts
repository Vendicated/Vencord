/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { THEMES_DIR } from "@main/utils/constants";
import { IpcMainInvokeEvent } from "electron";
import { writeFile, unlink } from "fs/promises";
import { request } from "https";
import { join, normalize } from "path";

const ALLOWED_HOSTS = new Set(["betterdiscord.app", "www.betterdiscord.app"]);

function ensureSafeThemePath(fileName: string): string {
    if (!fileName.endsWith(".css")) {
        throw new Error("Theme file must end with .css");
    }
    const normalizedBase = normalize(THEMES_DIR + "/");
    const fullPath = normalize(join(THEMES_DIR, fileName));
    if (!fullPath.startsWith(normalizedBase)) {
        throw new Error("Unsafe theme path");
    }
    return fullPath;
}

function fetchUrl(url: URL): Promise<string> {
    return new Promise((resolve, reject) => {
        const req = request(
            url,
            {
                method: "GET",
                headers: {
                    "User-Agent": "Vencord-OnlineThemeInstaller/1.0",
                    Accept: "text/html,application/xhtml+xml,text/css,*/*",
                },
            },
            res => {
                const status = res.statusCode ?? 0;

                if (status >= 300 && status < 400 && res.headers.location) {
                    res.resume();
                    const next = new URL(res.headers.location, url);
                    if (!ALLOWED_HOSTS.has(next.hostname)) {
                        reject(new Error("Redirect blocked"));
                        return;
                    }
                    resolve(fetchUrl(next));
                    return;
                }

                if (status < 200 || status >= 300) {
                    reject(new Error(`HTTP ${status}`));
                    res.resume();
                    return;
                }

                const chunks: Buffer[] = [];
                res.on("data", chunk => chunks.push(chunk));
                res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
            }
        );

        req.on("error", reject);
        req.end();
    });
}

export async function fetchText(_: IpcMainInvokeEvent, url: string): Promise<string> {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
        throw new Error("Only https://betterdiscord.app URLs are allowed");
    }

    return fetchUrl(parsed);
}

export async function saveThemeFile(_: IpcMainInvokeEvent, fileName: string, content: string): Promise<void> {
    const path = ensureSafeThemePath(fileName);
    await writeFile(path, content, "utf8");
}

export async function deleteThemeFile(_: IpcMainInvokeEvent, fileName: string): Promise<void> {
    const path = ensureSafeThemePath(fileName);
    await unlink(path).catch(() => { });
}
