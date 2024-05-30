/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";
import https from "https";

export async function postAttachment(_: IpcMainInvokeEvent, url: string, apiKey: string) {
    const formData = `url=${encodeURIComponent(url)}`;
    const options = {
        hostname: "virustotal.com",
        path: "/api/v3/urls",
        method: "POST",
        headers: {
            "Accept": "application/json",
            "content-type": "application/x-www-form-urlencoded",
            "x-apikey": apiKey
        }
    }

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            if (res.statusCode != 200) {
                reject(handleStatusCode(res.statusCode));
            }
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                resolve(JSON.parse(responseData));
            });
        });
        req.on("error", reject);
        req.write(formData);
        req.end();
    });
}

export async function getUrlId(_: IpcMainInvokeEvent, id: string, apiKey: string) {
    const options = {
        hostname: "virustotal.com",
        path: `/api/v3/analyses/${id}`,
        method: "GET",
        headers: {
            "Accept": "application/json",
            "content-type": "application/x-www-form-urlencoded",
            "x-apikey": apiKey
        }
    }

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            if (res.statusCode != 200) {
                reject(handleStatusCode(res.statusCode));
            }
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                resolve(JSON.parse(responseData));
            });
        });
        req.on("error", reject);
        req.end();
    });
}

function handleStatusCode(code: undefined | number): Error {
    if (code == null) {
        return new Error(String("Something went wrong please try again."), { cause: { code: null } });
    }
    else if (code == 401) {
        return new Error(String("Please input a valid API-key."), { cause: { code: "AuthenticationRequiredError" } });
    }
    else if (code == 429) {
        return new Error(String("Your quota is exceeded, please try again later."), { cause: { code: "QuotaExceededError" } });
    }
    else {
        return new Error(String("Something went wrong please try again."));
    }
}
