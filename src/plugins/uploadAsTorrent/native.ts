/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

export async function downloadFile(_: IpcMainInvokeEvent, url: string): Promise<Blob> {
    try {
        const res = await fetch(url, {
            credentials: "omit",
            mode: "cors",
            referrer: "",
            headers: {
                accept: "*/*",
            }
        });

        if (!res.ok)
            throw new Error(`HTTP error! status: ${res.status}`);

        const blob = await res.blob();
        if (blob.size === 0)
            throw new Error("Downloaded file is empty");

        return new Blob([blob], { type: "application/x-bittorrent" });
    } catch (err) {
        console.error("[Torrent] Download failed:", err);
        throw new Error("Failed to download torrent file");
    }
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
