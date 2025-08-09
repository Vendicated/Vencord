/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PluginNative } from "@utils/types";
import { chooseFile } from "@utils/web";


const Native = VencordNative.pluginHelpers.CustomScreensharePreview as PluginNative<typeof import("./native")>;

export async function getFileWeb(mimeTypes: string): Promise<string | null> {
    const file = await chooseFile(mimeTypes);
    if (!file) {
        return null;
    }

    const buffer = await file.arrayBuffer();
    return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, "0")).join("");
}

export async function getFileNative(title: string, filters: Electron.FileFilter[]): Promise<string | null> {
    const path = await Native.pickFile(title, filters);

    if (!path) {
        return null;
    }

    return await Native.getFile(path, "hex");
}

export function checkFileMime(hex: string) {
    if (hex.startsWith("89504e470d0a1a0a")) {
        return "image/png";
    } else if (hex.startsWith("ffd8ff")) {
        return "image/jpeg";
    } else if (hex.startsWith("52494646") && hex.startsWith("57454250", 16)) {
        // 52494646 ?? ?? ?? ?? 57454250
        return "image/webp";
    }

    return "unknown";
}

export function hexToBase64(hex: string) {
    let base64 = "";
    for (let i = 0; i < hex.length; i++) {
        base64 += !(i - 1 & 1) ? String.fromCharCode(parseInt(hex.substring(i - 1, i + 1), 16)) : "";
    }

    return btoa(base64);
}
