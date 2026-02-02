/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as handlers from "@song-spotlight/api/handlers";
import type { Song } from "@song-spotlight/api/structs";
import { setFetchHandler } from "@song-spotlight/api/util";
import { type IpcMainInvokeEvent, net } from "electron";

async function handleThumbnail(render: handlers.RenderSongInfo | null) {
    if (!render) return null;

    if (render.thumbnailUrl) {
        try {
            const res = await fetch(render.thumbnailUrl);
            const buffer = await res.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            const type = res.headers.get("content-type") || "image/jpeg";

            render.thumbnailUrl = `data:${type};base64,${base64}`;
        } catch {
            render.thumbnailUrl = undefined;
        }
    }

    return render;
}

setFetchHandler(
    (function electronFetch(input: string | URL, init: RequestInit = {}) {
        return new Promise<Response>((resolve, reject) => {
            const url = new URL(input).toString();
            const request = net.request({
                url,
                method: init.method,
                redirect: init.redirect,
                cache: init.cache,
                headers: init.headers instanceof Headers
                    ? Object.fromEntries(init.headers.entries().toArray())
                    : Array.isArray(init.headers)
                        ? Object.fromEntries(init.headers)
                        : init.headers,
            });

            let redirected: string | undefined = undefined;

            request.on("response", response => {
                const chunks: Buffer[] = [];
                response.on("data", chunk => chunks.push(chunk));

                response.on("end", () => {
                    const buffer = Buffer.concat(chunks);

                    const fetchResponse = {
                        ok: response.statusCode >= 200 && response.statusCode < 300,
                        status: response.statusCode,
                        statusText: response.statusMessage,
                        redirected: !!redirected,
                        url: redirected ?? url,
                        headers: new Headers(
                            Object.fromEntries(
                                Object.entries(response.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join() : v]),
                            ),
                        ),

                        async text() {
                            return buffer.toString("utf8");
                        },
                    };
                    resolve(fetchResponse as Response);
                });

                response.on("error", reject);
            });
            request.on("redirect", (_code, _method, url) => {
                redirected = new URL(url).toString();
            });

            request.on("error", reject);
            request.on("abort", () => reject(new Error("Request aborted")));

            if (init.body) {
                if (init.body instanceof ArrayBuffer) {
                    request.write(Buffer.from(init.body));
                } else if (Buffer.isBuffer(init.body) || typeof init.body === "string") {
                    request.write(init.body);
                } else {
                    request.write(JSON.stringify(init.body));
                }
            }

            request.end();
        });
    }) as unknown as typeof fetch,
);

export async function parseLink(_: IpcMainInvokeEvent, link: string) {
    return handlers.parseLink(link);
}
export async function rebuildLink(_: IpcMainInvokeEvent, song: Song) {
    return handlers.rebuildLink(song);
}
export async function renderSong(_: IpcMainInvokeEvent, song: Song) {
    return handlers.renderSong(song).then(handleThumbnail);
}
export async function validateSong(_: IpcMainInvokeEvent, song: Song) {
    return handlers.validateSong(song);
}

export function clearCache() {
    return handlers.clearCache();
}
