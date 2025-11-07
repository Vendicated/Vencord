/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

export async function checkBlockedUser(_: IpcMainInvokeEvent, userId: string, apiKey: string) {
    const url = `https://nxpdev.dk/api/blocked/${userId}`;

    try {
        const res = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`
            }
        });

        if (!res.ok) {
            return {
                status: res.status,
                data: null,
                error: `HTTP ${res.status}`
            };
        }

        const data = await res.json();
        return { status: res.status, data, error: null };
    } catch (e) {
        return {
            status: -1,
            data: null,
            error: String(e)
        };
    }
}
