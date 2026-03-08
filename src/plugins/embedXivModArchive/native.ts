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

export async function fetchXmaJson(_: IpcMainInvokeEvent, modId: string): Promise<any> {
    const url = `https://www.xivmodarchive.com/modid/${modId}?json=true`;
    return new Promise((resolve, reject) => {
        try {
            const req = net.request(url);
            req.setHeader("User-Agent", "TransCoder");
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

export async function fetchImageAsDataUrl(_: IpcMainInvokeEvent, url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const req = net.request(url);
            const chunks: Buffer[] = [];
            req.on("response", res => {
                const status = res.statusCode ?? 0;
                if (status !== 200) {
                    const err = new Error(`HTTP ${status}`);
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
                        const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
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
