/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";

const STORAGE_KEY = "ScattrdCustomSounds";

export interface StoredAudioFile {
    id: string;
    name: string;
    buffer: ArrayBuffer;
    type: string;
    dataUri?: string;
}

export async function saveAudio(file: File): Promise<string> {
    const id = crypto.randomUUID();
    const buffer = await file.arrayBuffer();

    const dataUri = await generateDataURI(buffer, file.type, file.name);

    const current = (await get(STORAGE_KEY)) ?? {};
    current[id] = {
        id,
        name: file.name,
        buffer,
        type: file.type,
        dataUri
    };
    await set(STORAGE_KEY, current);
    return id;
}

export async function getAllAudio(): Promise<Record<string, StoredAudioFile>> {
    return (await get(STORAGE_KEY)) ?? {};
}

async function generateDataURI(buffer: ArrayBuffer, type: string, name: string): Promise<string> {
    try {
        let mimeType = type || "audio/mpeg";

        if (!mimeType || mimeType === "application/octet-stream") {
            if (name) {
                const extension = name.split(".").pop()?.toLowerCase();
                switch (extension) {
                    case "ogg": mimeType = "audio/ogg"; break;
                    case "mp3": mimeType = "audio/mpeg"; break;
                    case "wav": mimeType = "audio/wav"; break;
                    case "m4a":
                    case "mp4": mimeType = "audio/mp4"; break;
                    case "flac": mimeType = "audio/flac"; break;
                    case "aac": mimeType = "audio/aac"; break;
                    case "webm": mimeType = "audio/webm"; break;
                    case "wma": mimeType = "audio/x-ms-wma"; break;
                    default: mimeType = "audio/mpeg";
                }
            }
        }

        const uint8Array = new Uint8Array(buffer);
        const blob = new Blob([uint8Array], { type: mimeType });

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("[CustomSounds] Error generating data URI:", error);

        const uint8Array = new Uint8Array(buffer);
        let binary = "";
        const chunkSize = 8192;

        for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.slice(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
        }

        const base64 = btoa(binary);
        return `data:${type || "audio/mpeg"};base64,${base64}`;
    }
}

export async function getAudioDataURI(id: string): Promise<string | undefined> {
    const all = await getAllAudio();
    const entry = all[id];
    if (!entry) return undefined;

    if (entry.dataUri) {
        return entry.dataUri;
    }

    console.log(`[CustomSounds] No cached data URI for ${id}, generating...`);
    const dataUri = await generateDataURI(entry.buffer, entry.type, entry.name);

    const current = await getAllAudio();
    current[id].dataUri = dataUri;
    await set(STORAGE_KEY, current);

    return dataUri;
}

export async function deleteAudio(id: string): Promise<void> {
    const all = await getAllAudio();
    delete all[id];
    await set(STORAGE_KEY, all);
}
