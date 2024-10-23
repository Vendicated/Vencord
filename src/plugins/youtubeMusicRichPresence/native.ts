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
    if (!str || str === "") return "";
    const json = JSON.parse(str);
    const matches = json.filter((page: { type: string; url: string; }) =>
        page.url.startsWith("https://music.youtube.com") && page.type === "page");
    return matches[0]?.webSocketDebuggerUrl || "";
};

export function getWebSocketDebuggerUrl(): Promise<string> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("Timed out while trying to get the WebSocket debugger URL"));
        }, 400);

        const req = http.request(options, function (res) {
            const chunks: any[] = [];

            res.on("data", function (chunk) {
                chunks.push(chunk);
            });

            res.on("end", function () {
                clearTimeout(timeout);
                const body = Buffer.concat(chunks);
                resolve(getURLFromString(body.toString()));
            });

            res.on("error", error => {
                clearTimeout(timeout);
                reject(error);
            });
        });

        req.on("error", error => {
            clearTimeout(timeout);
            reject(error);
        });

        req.end();
    });
}
