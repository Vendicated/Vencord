/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";
import { request } from "https";

export async function getBufferResponse(_: IpcMainInvokeEvent, url: string) {
    return new Promise<Buffer>((resolve, reject) => {
        const req = request(new URL(url), { method: "GET" }, res => {
            const chunks: Uint8Array[] = [];

            res.on("data", function (chunk) {
                chunks.push(chunk);
            });

            res.on("end", function () {
                const body = Buffer.concat(chunks);
                resolve(body);
            });
        });
        req.on("error", reject);
        req.end();
    });
}

