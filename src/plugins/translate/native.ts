/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";
import { request } from "https";

interface DeepLResponse {
    status?: number;
    data: string;
}

export function makeRequest(_: IpcMainInvokeEvent, pro: boolean, apiKey: string, payload: string): Promise<DeepLResponse> {
    const url = pro
        ? "https://api.deepl.com/v2/translate"
        : "https://api-free.deepl.com/v2/translate";

    return new Promise<DeepLResponse>((resolve, reject) => {
        const req = request(new URL(url), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `DeepL-Auth-Key ${apiKey}`
            }
        }, res => {
            let responseBody = "";
            res.on("data", chunk => responseBody += chunk);
            res.on("end", () => resolve({ status: res.statusCode, data: responseBody }));
        });
        req.on("error", err => reject({ data: err.message }));
        req.write(payload);
        req.end();
    });
}
