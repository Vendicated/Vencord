/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

// we love CORS
export async function fetchAudio(_: IpcMainInvokeEvent, url: string): Promise<Uint8Array> {
    if (new URL(url).hostname !== "cdn.discordapp.com") throw new Error("Unknown URL");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    if (!res.headers.get("Content-Type")?.startsWith("audio/")) throw new Error(`${url} is not an audio file`);
    return new Uint8Array(await res.arrayBuffer());
}
