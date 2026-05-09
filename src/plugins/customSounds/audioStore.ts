/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";
import { Logger } from "@utils/Logger";

const STORAGE_KEY = "CustomSounds";
const METADATA_KEY = "CustomSounds_Metadata";

// Default maximum file size: 15MB per file
const DEFAULT_MAX_FILE_SIZE_MB = 15;

// Configurable max file size (set by plugin settings)
let maxFileSizeMB = DEFAULT_MAX_FILE_SIZE_MB;

const logger = new Logger("CustomSounds");

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
 * Returns audio files metadata.
 */
export async function getAllAudioMetadata(): Promise<MetadataStore> {
    return (await get(METADATA_KEY)) as MetadataStore ?? {};
}

async function setMetadataStore(new_: MetadataStore): Promise<void> {
    await set(METADATA_KEY, new_);
}

/**
 * Returns a single audio file's data URI.
 */
export async function getAudioDataURI(id: string): Promise<string | undefined> {
    const all: AudioStore = await getAllAudio();
    return all?.[id]?.dataUri;
}

/**
 * Returns all audio files (use sparingly as it loads all the data)
 */
export async function getAllAudio(): Promise<AudioStore> {
    return (await get(STORAGE_KEY)) as AudioStore ?? {};
}

async function setAudioStore(new_: AudioStore): Promise<void> {
    await set(STORAGE_KEY, new_);
}

export async function saveAudioData(audioData: [StoredAudioFile, AudioFileMetadata][]): Promise<void> {
    const audioStore: AudioStore = await getAllAudio();
    const metadataStore: MetadataStore = await getAllAudioMetadata();

    for (const [data, metadata] of audioData) { // processing files asyncronounsly makes no real difference
        audioStore[metadata.id] = data;
        metadataStore[metadata.id] = metadata;
    }

    await setAudioStore(audioStore);
    await setMetadataStore(metadataStore);
}

export async function processAudioFile(file: File): Promise<[StoredAudioFile, AudioFileMetadata]> {
    const maxBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
        const fileMB = (file.size / (1024 * 1024)).toFixed(1);
        throw new Error(`File "${file.name}" is too large (${fileMB}MB). Maximum size is ${maxFileSizeMB}MB.`);
    }

    const buffer = await file.arrayBuffer();
    const id = file.name;
    const dataUri = await generateDataURI(buffer, file.type, file.name);

    return [
        {
            id,
            name: file.name,
            type: file.type,
            dataUri
        },
        {
            id,
            name: file.name,
            type: file.type,
            size: dataUri.length
        }
    ];
}

/**
 * Deletes an audio file.
 */
export async function deleteAudio(id: string): Promise<void> {
    // Delete from audio store
    const audioStore: AudioStore = await getAllAudio();
    if (audioStore[id]) {
        delete audioStore[id];
        await setAudioStore(audioStore);
    }

    // Delete from metadata store
    const metadataStore: MetadataStore = await getAllAudioMetadata();
    if (metadataStore[id]) {
        delete metadataStore[id];
        await setMetadataStore(metadataStore);
    }
}

/**
 * Deletes all audio files.
 */
export async function clearStore(): Promise<void> {
    await setAudioStore({});
    await setMetadataStore({});
}

/**
 * Migrates old storage format to new format (run once on startup).
 */
export async function migrateStorage(): Promise<{ [oldId: string]: string; } | null> {
    const audioStore = (await get(STORAGE_KEY)) as Record<string, any> | undefined;
    if (!audioStore) return null;

    let needsMigration = false;
    let needsMetadataRebuild = false;

    for (const file of Object.values(audioStore)) {
        if (!file) continue;
        if (typeof file !== "object") continue;

        if ("buffer" in file ||
            ("id" in file && file.id !== file.name)) {
            needsMigration = true;
            break;
        }
    }

    const metadataStore = await get(METADATA_KEY);
    if (!metadataStore && Object.keys(audioStore).length > 0) {
        needsMetadataRebuild = true;
    }

    const migratedFiles: { [oldId: string]: string; } = {};
    if (needsMigration) {
        logger.info("Migrating storage to remove redundant buffers and fix IDs...");
        const newAudioStore: AudioStore = {};

        for (const file of Object.values(audioStore)) {
            if (!file || typeof file !== "object") continue;

            // If it has dataUri, keep it; if only buffer, generate dataUri
            let { dataUri } = file;
            if (!dataUri && file.buffer) {
                dataUri = await generateDataURI(file.buffer, file.type, file.name);
            }

            if (!dataUri) continue;

            logger.debug("Migrating a file: ", file);

            // might want to reuse processAudioFile for this (and the migration check above)
            // so it's not pain in the ass to change it (if ever needed at all)
            const oldId = file.id;
            const newId = file.name;

            newAudioStore[newId] = {
                id: newId,
                name: file.name || "Unknown",
                type: file.type || "audio/mpeg",
                dataUri
            };

            migratedFiles[oldId] = newId;
        }

        await setAudioStore(newAudioStore);
        needsMetadataRebuild = true;
        logger.info("Storage migration complete.");
    }

    if (needsMetadataRebuild) {
        logger.info("Rebuilding metadata index...");
        const currentAudioStore = await getAllAudio();
        const newMetadataStore: MetadataStore = {};

        for (const [id, file] of Object.entries(currentAudioStore)) {
            newMetadataStore[id] = {
                id: file.id,
                name: file.name,
                type: file.type,
                size: file.dataUri?.length || 0
            };
        }

        await setMetadataStore(newMetadataStore);
        logger.info("Metadata rebuild complete");
    }

    return migratedFiles;
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
 * Returns total storage usage info in an object.
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
