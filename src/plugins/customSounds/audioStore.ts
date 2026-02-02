/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";

const STORAGE_KEY = "ScattrdCustomSounds";
const METADATA_KEY = "ScattrdCustomSounds_Metadata";

// Default maximum file size: 15MB per file
const DEFAULT_MAX_FILE_SIZE_MB = 15;

// Configurable max file size (set by plugin settings)
let maxFileSizeMB = DEFAULT_MAX_FILE_SIZE_MB;

export function setMaxFileSizeMB(sizeMB: number): void {
    maxFileSizeMB = sizeMB;
}

export function getMaxFileSizeMB(): number {
    return maxFileSizeMB;
}

export interface StoredAudioFile {
    id: string;
    name: string;
    type: string;
    dataUri: string;
}

export interface AudioFileMetadata {
    id: string;
    name: string;
    type: string;
    size: number; // Size of dataUri in bytes
}

// Lightweight metadata stored separately for fast access
type MetadataStore = Record<string, AudioFileMetadata>;

// Full audio data (only dataUri, no redundant buffer)
type AudioStore = Record<string, StoredAudioFile>;

/**
 * Get only metadata (lightweight, no audio data loaded)
 */
export async function getAllAudioMetadata(): Promise<MetadataStore> {
    return (await get(METADATA_KEY)) ?? {};
}

/**
 * Get a single audio file's data URI without loading all files
 */
export async function getAudioDataURI(id: string): Promise<string | undefined> {
    const all = (await get(STORAGE_KEY)) as AudioStore | undefined;
    return all?.[id]?.dataUri;
}

/**
 * Get all audio files (use sparingly - loads all data)
 */
export async function getAllAudio(): Promise<AudioStore> {
    return (await get(STORAGE_KEY)) ?? {};
}

/**
 * Save an audio file with size validation
 */
export async function saveAudio(file: File): Promise<string> {
    // Validate file size before processing
    const maxBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
        const fileMB = (file.size / (1024 * 1024)).toFixed(1);
        throw new Error(`File too large (${fileMB}MB). Maximum size is ${maxFileSizeMB}MB.`);
    }

    const id = crypto.randomUUID();
    const buffer = await file.arrayBuffer();
    const dataUri = await generateDataURI(buffer, file.type, file.name);

    // Store the audio data (only dataUri, not buffer)
    const audioStore = (await get(STORAGE_KEY)) as AudioStore ?? {};
    audioStore[id] = {
        id,
        name: file.name,
        type: file.type,
        dataUri
    };
    await set(STORAGE_KEY, audioStore);

    // Store metadata separately for fast access
    const metadataStore = (await get(METADATA_KEY)) as MetadataStore ?? {};
    metadataStore[id] = {
        id,
        name: file.name,
        type: file.type,
        size: dataUri.length
    };
    await set(METADATA_KEY, metadataStore);

    return id;
}

/**
 * Delete an audio file
 */
export async function deleteAudio(id: string): Promise<void> {
    // Delete from audio store
    const audioStore = (await get(STORAGE_KEY)) as AudioStore ?? {};
    if (audioStore[id]) {
        delete audioStore[id];
        await set(STORAGE_KEY, audioStore);
    }

    // Delete from metadata store
    const metadataStore = (await get(METADATA_KEY)) as MetadataStore ?? {};
    if (metadataStore[id]) {
        delete metadataStore[id];
        await set(METADATA_KEY, metadataStore);
    }
}

/**
 * Migrate old storage format to new format (run once on startup)
 */
export async function migrateStorage(): Promise<boolean> {
    const audioStore = (await get(STORAGE_KEY)) as Record<string, any> | undefined;
    if (!audioStore) return false;

    let needsMigration = false;
    let needsMetadataRebuild = false;

    // Check if any entries have the old 'buffer' field
    for (const file of Object.values(audioStore)) {
        if (file && typeof file === "object" && "buffer" in file) {
            needsMigration = true;
            break;
        }
    }

    // Check if metadata store exists
    const metadataStore = await get(METADATA_KEY);
    if (!metadataStore && Object.keys(audioStore).length > 0) {
        needsMetadataRebuild = true;
    }

    if (needsMigration) {
        console.log("[CustomSounds] Migrating storage to remove redundant buffers...");
        const newAudioStore: AudioStore = {};

        for (const [id, file] of Object.entries(audioStore)) {
            if (file && typeof file === "object") {
                // If it has dataUri, keep it; if only buffer, generate dataUri
                let { dataUri } = file;
                if (!dataUri && file.buffer) {
                    dataUri = await generateDataURI(file.buffer, file.type, file.name);
                }

                if (dataUri) {
                    newAudioStore[id] = {
                        id: file.id || id,
                        name: file.name || "Unknown",
                        type: file.type || "audio/mpeg",
                        dataUri
                    };
                }
            }
        }

        await set(STORAGE_KEY, newAudioStore);
        needsMetadataRebuild = true;
        console.log("[CustomSounds] Storage migration complete");
    }

    if (needsMetadataRebuild) {
        console.log("[CustomSounds] Rebuilding metadata index...");
        const currentAudioStore = (await get(STORAGE_KEY)) as AudioStore ?? {};
        const newMetadataStore: MetadataStore = {};

        for (const [id, file] of Object.entries(currentAudioStore)) {
            newMetadataStore[id] = {
                id: file.id,
                name: file.name,
                type: file.type,
                size: file.dataUri?.length || 0
            };
        }

        await set(METADATA_KEY, newMetadataStore);
        console.log("[CustomSounds] Metadata rebuild complete");
    }

    return needsMigration || needsMetadataRebuild;
}

async function generateDataURI(buffer: ArrayBuffer, type: string, name: string): Promise<string> {
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
}

/**
 * Get total storage usage info
 */
export async function getStorageInfo(): Promise<{ fileCount: number; totalSizeKB: number; }> {
    const metadata = await getAllAudioMetadata();
    let totalSize = 0;

    for (const file of Object.values(metadata)) {
        totalSize += file.size || 0;
    }

    return {
        fileCount: Object.keys(metadata).length,
        totalSizeKB: Math.round(totalSize / 1024)
    };
}
