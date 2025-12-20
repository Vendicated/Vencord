/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createWriteStream } from "original-fs";
import { Readable } from "stream";
import { finished } from "stream/promises";

type Url = string | URL;

export async function checkedFetch(url: Url, options?: RequestInit) {
    try {
        var res = await fetch(url, options);
    } catch (err) {
        if (err instanceof Error && err.cause) {
            err = err.cause;
        }

        throw new Error(`${options?.method ?? "GET"} ${url} failed: ${err}`);
    }

    if (res.ok) {
        return res;
    }

    let message = `${options?.method ?? "GET"} ${url}: ${res.status} ${res.statusText}`;
    try {
        const reason = await res.text();
        message += `\n${reason}`;
    } catch { }

    throw new Error(message);
}

export async function fetchJson<T = any>(url: Url, options?: RequestInit) {
    const res = await checkedFetch(url, options);
    return await res.json() as Promise<T>;
}

export async function fetchBuffer(url: Url, options?: RequestInit) {
    const res = await checkedFetch(url, options);
    const buf = await res.arrayBuffer();

    return Buffer.from(buf);
}

export async function downloadToFile(url: Url, path: string, options?: RequestInit) {
    const res = await checkedFetch(url, options);
    if (!res.body) {
        throw new Error(`Download ${url}: response body is empty`);
    }

    // @ts-expect-error weird type conflict
    const body = Readable.fromWeb(res.body);
    await finished(body.pipe(createWriteStream(path)));
}
