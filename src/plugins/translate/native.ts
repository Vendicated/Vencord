/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

export async function makeDeeplTranslateRequest(_: IpcMainInvokeEvent, service: string, deeplxApiEndpoint: string, apiKey: string, payload: string) {
    const urls = {
        "deepl": "https://api-free.deepl.com/v2/translate",
        "deepl-pro": "https://api.deepl.com/v2/translate",
        "deepl-x": deeplxApiEndpoint
    };

    try {
        const res = await fetch(urls[service], {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(service === "deepl-x" ? {} : { "Authorization": `DeepL-Auth-Key ${apiKey}` })
            },
            body: payload
        });

        const data = await res.text();
        return { status: res.status, data };
    } catch (e) {
        return { status: -1, data: String(e) };
    }
}
