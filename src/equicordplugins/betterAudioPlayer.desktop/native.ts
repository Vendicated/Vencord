/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

const allowedHosts = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

export async function fetchAudio(_: IpcMainInvokeEvent, url: string): Promise<ArrayBuffer> {
    if (!allowedHosts.has(new URL(url).hostname)) throw new Error("Unknown URL");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    return res.arrayBuffer();
}
