/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

interface DeepLResponse {
    status?: number;
    data: string;
}

export async function makeRequest(_: IpcMainInvokeEvent, pro: boolean, apiKey: string, payload: string): Promise<DeepLResponse> {
    const url = pro
        ? "https://api.deepl.com/v2/translate"
        : "https://api-free.deepl.com/v2/translate";

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `DeepL-Auth-Key ${apiKey}`
        },
        body: payload
    });

    const data = await res.text();
    return { status: res.status, data };
}
