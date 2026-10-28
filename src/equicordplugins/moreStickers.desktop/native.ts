/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

export async function fetchLine(_: IpcMainInvokeEvent, url: string, init?: RequestInit) {
    const { hostname } = new URL(url);
    if (hostname !== "store.line.me" && !hostname.endsWith(".line-scdn.net")) throw new Error("Unknown URL");
    const res = await fetch(url, init);
    return { status: res.status, type: res.headers.get("content-type") ?? "", data: await res.arrayBuffer() };
}
