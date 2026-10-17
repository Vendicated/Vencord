/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

import { checkedFetch } from "@main/utils/http";
import { dialog, IpcMainInvokeEvent } from "electron";
import { BrowserWindow } from "electron/main";

const ALLOWED_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

export async function saveAttachment(_: IpcMainInvokeEvent, url: string) {
    const parsedURL = new URL(url);
    const { hostname, protocol } = parsedURL;

    if (!ALLOWED_HOSTS.has(hostname)) throw new Error(`Disallowed host: ${hostname}`);
    if (protocol !== "https:") throw new Error(`Disallowed protocol: ${protocol}`);

    const res = await checkedFetch(url);
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (!focusedWindow || !res.body) return;

    const choice = await dialog.showSaveDialog({
        defaultPath: parsedURL.pathname.split("/").pop()
    });

    if (choice.canceled) return;

    await pipeline(res.body, createWriteStream(choice.filePath));
}
