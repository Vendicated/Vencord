/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ConnectSrc, CspPolicies, ImageSrc } from "@main/csp";
import { IpcMainInvokeEvent, net } from "electron";

CspPolicies["xivmodarchive.com"] = ConnectSrc;
CspPolicies["www.xivmodarchive.com"] = ConnectSrc;

CspPolicies["static.xivmodarchive.com"] = ImageSrc;

// helper: perform a GET and parse JSON in the main/native process (bypasses renderer CSP)
export async function fetchXmaJson(_: IpcMainInvokeEvent, modId: string): Promise<any> {
    const url = `https://www.xivmodarchive.com/modid/${modId}?json=true`;
    return new Promise((resolve, reject) => {
        try {
            const req = net.request(url);
            let body = "";
            req.on("response", res => {
                res.on("data", chunk => (body += chunk.toString()));
                res.on("end", () => {
                    try {
                        const parsed = JSON.parse(body);
                        resolve(parsed);
                    } catch (err) {
                        reject(err);
                    }
                });
            });
            req.on("error", err => {
                reject(err);
            });
            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

// helper: fetch an image and return a data: URL (avoids hotlink/referrer problems)
export async function fetchImageAsDataUrl(_: IpcMainInvokeEvent, url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const req = net.request(url);
            const chunks: Buffer[] = [];
            req.on("response", res => {
                const status = res.statusCode ?? 0;
                if (status !== 200) {
                    const err = new Error(`HTTP ${status}`);
                    // still collect body for debugging if any
                    res.on("data", c => chunks.push(Buffer.from(c)));
                    res.on("end", () => {
                        reject(err);
                    });
                    return;
                }

                res.on("data", c => chunks.push(Buffer.from(c)));
                res.on("end", () => {
                    try {
                        const buf = Buffer.concat(chunks);
                        const mime = (res.headers["content-type"] || "image/jpeg") as string;
                        const dataUrl = `data:${mime};base64,${buf.toString("base64")}`.replace("?format=png", "");
                        resolve(dataUrl);
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            req.on("error", err => {
                reject(err);
            });
            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

// expose to renderer via the global bridge object the rest of the app already expects
// (restart the app after modifying native code so this is picked up)
(global as any).VencordNative = Object.assign((global as any).VencordNative || {}, {
    fetchXmaJson,
    fetchImageAsDataUrl
});
