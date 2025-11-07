/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

export async function checkBlockedUser(_: IpcMainInvokeEvent, userId: string) {
    const url = `https://raw.githubusercontent.com/NexusProjectsEU/blocks/main/${userId}/`;

    try {
        const dirRes = await fetch(`https://api.github.com/repos/NexusProjectsEU/blocks/contents/${userId}`);

        if (!dirRes.ok) {
            if (dirRes.status === 404) {
                return { status: 404, data: null, error: null };
            }
            return {
                status: dirRes.status,
                data: null,
                error: `HTTP ${dirRes.status}`
            };
        }

        const files = await dirRes.json();

        const entryFiles = files.filter((f: any) => f.name.startsWith("entry-") && f.name.endsWith(".json"));

        if (entryFiles.length === 0) {
            return { status: 404, data: null, error: null };
        }

        for (const file of entryFiles) {
            const entryRes = await fetch(file.download_url);
            if (!entryRes.ok) continue;

            const data = await entryRes.json();

            if (data.blocked && data.active) {
                if (data.expiresAt) {
                    const expiryDate = new Date(data.expiresAt);
                    if (expiryDate > new Date()) {
                        return { status: 200, data: { blocked: true }, error: null };
                    }
                } else {
                    return { status: 200, data: { blocked: true }, error: null };
                }
            }
        }

        return { status: 200, data: { blocked: false }, error: null };
    } catch (e) {
        return {
            status: -1,
            data: null,
            error: String(e)
        };
    }
}
