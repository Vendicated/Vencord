/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { checkedFetch } from "@main/utils/http";
import { IpcMainInvokeEvent } from "electron";

const ALLOWED_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);
const MAX_FILE_SIZE = 367001600; // 350 MB

export async function fetchAttachment(_: IpcMainInvokeEvent, url: string) {
    const parsedURL = new URL(url);
    const { hostname, protocol } = parsedURL;

    if (!ALLOWED_HOSTS.has(hostname)) throw new Error(`Disallowed host: ${hostname}`);
    if (protocol !== "https:") throw new Error(`Disallowed protocol: ${protocol}`);

    const res = await checkedFetch(url);
    const content_length = res.headers.get("content-length");
    const file_size = Number(content_length);

    if (content_length == null) {
        throw new Error("Missing required header: Content-Length");
    }

    if (file_size > MAX_FILE_SIZE) {
        throw new Error(`File is too large: ${file_size} > ${MAX_FILE_SIZE}`);
    }

    return { bytes: await res.bytes(), type: res.headers.get("content-type") ?? "application/octet-stream" };
}
