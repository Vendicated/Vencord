/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

const urlChecks = [
    (url: URL) => url.host === "cdn.discordapp.com",
    (url: URL) => url.pathname.startsWith("/attachments/"),
    (url: URL) => url.pathname.endsWith(".pdf")
];

export async function getBufferResponse(_: IpcMainInvokeEvent, url: string): Promise<Buffer> {
    const urlObj = new URL(url);
    if (!urlChecks.every(check => check(urlObj))) {
        throw new Error("Invalid URL");
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
