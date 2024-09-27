/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import http from "node:http";

const options: http.RequestOptions = {
    hostname: "localhost",
    port: 9222,
    path: "/json",
    method: "GET",
    headers: {
        "accept": "*/*"
    }
};
const getURLFromString = (str: string): string => {
    const json = JSON.parse(str);
    const matches = json.filter((page: { type: string; url: string; }) =>
        page.url.startsWith("https://music.youtube.com") && page.type === "page");
    return matches[0].webSocketDebuggerUrl;
};

export function getWebSocketDebuggerUrl(): Promise<string> {
    return new Promise((resolve, reject) => {
        const req = http.request(options, function (res) {
            const chunks: any[] = [];

            res.on("data", function (chunk) {
                chunks.push(chunk);
            });

            res.on("end", function () {
                const body = Buffer.concat(chunks);
                resolve(getURLFromString(body.toString()));
            });

            res.on("error", error => {
                reject(error);
            });
        });

        req.end();
    });
}
