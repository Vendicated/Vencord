/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

const ALLOWED_HOSTS = new Set([
    "cdn.discordapp.com",
    "media.discordapp.net",
]);

const ALLOWED_PATH_PREFIXES = [
    "/attachments/",
    "/ephemeral-attachments/",
];

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46];
const ABSOLUTE_MIN_BYTES = 1024 * 1024;
const ABSOLUTE_MAX_BYTES = 200 * 1024 * 1024;
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

function clampMaxBytes(maxBytes: number) {
    if (!Number.isFinite(maxBytes)) return DEFAULT_MAX_BYTES;
    return Math.min(ABSOLUTE_MAX_BYTES, Math.max(ABSOLUTE_MIN_BYTES, Math.floor(maxBytes)));
}

function validateAttachmentUrl(rawUrl: string) {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new Error("Invalid attachment URL");
    }

    if (parsed.protocol !== "https:") throw new Error("Only HTTPS attachments can be previewed");
    if (!ALLOWED_HOSTS.has(parsed.hostname)) throw new Error("Only Discord CDN attachments can be previewed");

    const pathname = decodeURIComponent(parsed.pathname).toLowerCase();
    if (!ALLOWED_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
        throw new Error("URL is not a Discord attachment path");
    }
    if (!pathname.endsWith(".pdf")) throw new Error("Only .pdf attachments can be previewed");

    return parsed;
}

function hasPdfMagic(bytes: Uint8Array) {
    if (bytes.byteLength < PDF_MAGIC.length) return false;
    for (let i = 0; i < PDF_MAGIC.length; i++) {
        if (bytes[i] !== PDF_MAGIC[i]) return false;
    }
    return true;
}

export async function fetchPdf(_: IpcMainInvokeEvent, url: string, maxBytes: number) {
    const parsed = validateAttachmentUrl(url);
    const limit = clampMaxBytes(maxBytes);

    const response = await fetch(parsed, {
        method: "GET",
        redirect: "manual",
        headers: { Accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.1" },
    }).catch(() => null);

    if (!response) throw new Error("Failed to reach Discord CDN");
    if (response.status >= 300 && response.status < 400) throw new Error("Discord CDN tried to redirect; refusing for safety");
    if (!response.ok) throw new Error(`Discord CDN returned ${response.status} ${response.statusText || ""}`.trim());

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (contentType && contentType !== "application/pdf" && contentType !== "application/octet-stream" && contentType !== "binary/octet-stream") {
        throw new Error(`Unexpected content-type: ${contentType}`);
    }

    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > 0 && declaredLength > limit) {
        throw new Error(`PDF is ${Math.round(declaredLength / 1024 / 1024)} MB which exceeds the ${Math.round(limit / 1024 / 1024)} MB limit`);
    }

    let bytes: Uint8Array;

    if (response.body) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (!value || value.byteLength === 0) continue;

                received += value.byteLength;
                if (received > limit) {
                    throw new Error(`PDF exceeds the ${Math.round(limit / 1024 / 1024)} MB size limit`);
                }
                chunks.push(value);
            }
        } finally {
            try { await reader.cancel(); } catch { /* */ }
        }

        bytes = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
        }
    } else {
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > limit) {
            throw new Error(`PDF exceeds the ${Math.round(limit / 1024 / 1024)} MB size limit`);
        }
        bytes = new Uint8Array(buffer);
    }

    if (!hasPdfMagic(bytes)) throw new Error("Downloaded data is not a valid PDF");

    return bytes;
}
