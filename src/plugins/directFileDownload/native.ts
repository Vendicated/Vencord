/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { checkedFetch } from "@main/utils/http";
import { IpcMainInvokeEvent } from "electron";

const ALLOWED_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

export async function fetchAttachment(_: IpcMainInvokeEvent, url: string) {
    const parsedURL = new URL(url);
    const hostname = parsedURL.hostname;
    const protocol = parsedURL.protocol;

    if (!ALLOWED_HOSTS.has(hostname)) throw new Error(`Disallowed host: ${hostname}`);
    if (protocol !== "https:") throw new Error(`Disallowed protocol: ${protocol}`);

    const res = await checkedFetch(url);
    return { bytes: await res.bytes(), type: res.headers.get("content-type") ?? "application/octet-stream" };
}
