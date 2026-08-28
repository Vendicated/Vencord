/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

export async function sendWebhookRequest(
    _event: IpcMainInvokeEvent,
    url: string,
    method: string,
    body?: string
) {
    try {
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body
        });

        const text = await res.text();

        return {
            ok: res.ok,
            status: res.status,
            text
        };
    } catch (e: any) {
        return {
            ok: false,
            status: 0,
            text: e?.message ?? "Native request failed"
        };
    }
}
