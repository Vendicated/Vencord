/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";
import https from "https";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";

export async function postAttachment(_: IpcMainInvokeEvent, url: string, apiKey: string) {
    const formData = `scan_type=all&url=${encodeURIComponent(url)}`;
    const options = {
        hostname: "hybrid-analysis.com",
        path: "/api/v2/quick-scan/url",
        method: "POST",
        headers: {
            "accept": "application/json",
            "content-type": "application/x-www-form-urlencoded",
            "api-key": apiKey,
            "User-Agent": VENCORD_USER_AGENT
        }
    }
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                if (res.statusCode == 200) {
                    resolve(JSON.parse(responseData));
                }
                else {
                    reject(new Error(JSON.parse(responseData).message));
                }
            });
        });
        req.on("error", reject);
        req.write(formData);
        req.end();
    });
}
