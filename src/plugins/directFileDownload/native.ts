/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { checkedFetch } from "@main/utils/http";
import { IpcMainInvokeEvent } from "electron";

const ALLOWED_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

export async function fetchAttachment(_: IpcMainInvokeEvent, url: string, maxFileSizeSetting: number) {
    const parsedURL = new URL(url);
    const { hostname, protocol } = parsedURL;

    if (!ALLOWED_HOSTS.has(hostname)) throw new Error(`Disallowed host: ${hostname}`);
    if (protocol !== "https:") throw new Error(`Disallowed protocol: ${protocol}`);

    const maxFileSize = maxFileSizeSetting * 1024 * 1024;
    const res = await checkedFetch(url);
    const contentLength = res.headers.get("content-length");

    if (contentLength == null) {
        throw new Error("Missing required header: Content-Length");
    }

    const fileSize = Number(contentLength);

    if (fileSize > maxFileSize) {
        throw new Error(`File is too large: ${fileSize} > ${maxFileSize}`);
    }

    return { bytes: await res.bytes(), type: res.headers.get("content-type") ?? "application/octet-stream" };
}
