/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { logger } from "@plugins/soundPanel.desktop/utils/logger";
import { Native } from "@plugins/soundPanel.desktop/utils/native";
import { createStore, useStore } from "@plugins/soundPanel.desktop/utils/store";
import { useEffect, useMemo, useState } from "@webpack/common";

import type { LibraryItem, LibraryKind, LibraryPatch } from "./libraryIndex";
import { migrateLegacyLibrary, storage } from "./storage";

export type { LibraryItem, LibraryKind } from "./libraryIndex";

export interface PendingSong {
    id: string;
    youtubeId: string;
    name: string;
    artist?: string;
    cover: boolean;
    duration: number;
    progress: number | null;
    queued: boolean;
}

const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|oga|opus|m4a|aac|flac|webm|weba)$/i;

const libraryStore = createStore({ loaded: false, items: [] as LibraryItem[] });
const pendingStore = createStore({ songs: [] as PendingSong[], preparing: false });
const fileUrls = new Map<string, string>();
const coverUrls = new Map<string, string>();
const coverLoads = new Map<string, Promise<string | null>>();
let loadPromise: Promise<void> | undefined;

const setItems = (items: LibraryItem[]) => libraryStore.set({ loaded: true, items });

function loadLibrary() {
    return loadPromise ??= storage.readIndex()
        .then(migrateLegacyLibrary)
        .then(setItems)
        .catch(err => {
            loadPromise = undefined;
            logger.error("Failed to load the library", err);
        });
}

export async function refreshLibrary() {
    if (!libraryStore.get().loaded) return loadLibrary();

    try {
        setItems(await storage.readIndex());
    } catch (err) {
        logger.error("Failed to refresh the library", err);
    }
}

const newestFirst = (a: LibraryItem, b: LibraryItem) => b.addedAt - a.addedAt;
const itemsOfKind = (items: LibraryItem[], kind: LibraryKind) => items.filter(item => item.kind === kind).sort(newestFirst);

export function getItems(kind: LibraryKind) {
    return itemsOfKind(libraryStore.get().items, kind);
}

export const getItem = (id: string) => libraryStore.get().items.find(item => item.id === id);

export const useLibrarySong = (videoId: string | null) =>
    useStore(libraryStore, s => videoId ? s.items.find(item => item.youtubeId === videoId) : undefined);

export function useLibrary(kind: LibraryKind) {
    const loaded = useStore(libraryStore, s => s.loaded);
    const all = useStore(libraryStore, s => s.items);
    const items = useMemo(() => itemsOfKind(all, kind), [all, kind]);
    return { loaded, items };
}

function readDuration(blob: Blob) {
    return new Promise<number>(resolve => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio();
        const done = (duration: number) => {
            URL.revokeObjectURL(url);
            resolve(Number.isFinite(duration) ? duration : 0);
        };

        audio.preload = "metadata";
        audio.onloadedmetadata = () => done(audio.duration);
        audio.onerror = () => done(0);
        setTimeout(() => done(0), 5000);
        audio.src = url;
    });
}

export async function addFiles(files: File[], kind: LibraryKind) {
    await loadLibrary();

    const audioFiles = files.filter(file => file.type.startsWith("audio/") || AUDIO_EXTENSIONS.test(file.name));
    const added: LibraryItem[] = [];

    for (const file of audioFiles) {
        const item: LibraryItem = {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.[^.]+$/, "") || "Untitled",
            kind,
            mimeType: file.type,
            size: file.size,
            duration: await readDuration(file),
            volume: 1,
            addedAt: Date.now()
        };

        await storage.writeFile(item.id, file);
        added.push(item);
    }

    if (added.length) setItems(await storage.changeIndex({ type: "add", items: added }));

    return { added: added.length, skipped: files.length - audioFiles.length };
}

export const downloadLabel = (song: PendingSong) =>
    song.queued ? "Waiting for another download"
        : song.progress === null ? "Loading from YouTube"
            : `Downloading ${Math.round(song.progress * 100)}%`;
export const usePendingSongs = () => useStore(pendingStore, s => s.songs);
export const useYouTubePreparing = () => useStore(pendingStore, s => s.preparing);
export const getPendingSong = (id: string) => pendingStore.get().songs.find(song => song.id === id);
export const findPendingSong = (videoId: string) => pendingStore.get().songs.find(song => song.youtubeId === videoId);
export const findLibrarySong = (videoId: string) => libraryStore.get().items.find(item => item.youtubeId === videoId);

export function setPendingSong(song: PendingSong) {
    const { songs } = pendingStore.get();
    pendingStore.set({
        songs: songs.some(s => s.id === song.id) ? songs.map(s => s.id === song.id ? song : s) : [...songs, song]
    });
}

export function removePendingSong(id: string) {
    pendingStore.set({ songs: pendingStore.get().songs.filter(song => song.id !== id) });
}

export async function prepareYouTube() {
    if (!Native || await Native.hasYouTubeTools()) return;

    pendingStore.set({ preparing: true });
    try {
        await Native.prepareYouTubeTools();
    } finally {
        pendingStore.set({ preparing: false });
    }
}

export const nativeReason = (err: unknown) => String((err as Error)?.message ?? err).replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, "");

function loadCover(id: string) {
    let load = coverLoads.get(id);
    if (load) return load;

    load = (Native?.readLibraryCover(id) ?? Promise.resolve(null))
        .then(data => {
            if (!data) return null;

            const url = URL.createObjectURL(new Blob([data], { type: "image/jpeg" }));
            coverUrls.set(id, url);
            return url;
        })
        .finally(() => coverLoads.delete(id));

    coverLoads.set(id, load);
    return load;
}

export function useCoverUrl(item: { id: string; cover?: boolean; } | undefined) {
    const id = item?.cover ? item.id : null;
    const [, setLoaded] = useState(0);

    useEffect(() => {
        if (!id || coverUrls.has(id)) return;

        let mounted = true;
        loadCover(id).then(() => mounted && setLoaded(n => n + 1), err => logger.error("Failed to load a cover", err));
        return () => { mounted = false; };
    }, [id]);

    return id ? coverUrls.get(id) ?? null : null;
}

export function addBlob(blob: Blob, name: string, kind: LibraryKind) {
    const type = blob.type || "audio/ogg";
    const extension = type === "audio/mpeg" ? "mp3" : type.split("/")[1];
    return addFiles([new File([blob], `${name}.${extension}`, { type })], kind);
}

export async function updateItem(id: string, patch: LibraryPatch) {
    setItems(await storage.changeIndex({ type: "update", id, patch }));
}

export async function removeItem(id: string) {
    revokeUrl(fileUrls, id);
    revokeUrl(coverUrls, id);
    setItems(await storage.changeIndex({ type: "remove", id }));
    await storage.deleteFile(id);
}

export async function getFileUrl(id: string) {
    const cached = fileUrls.get(id);
    if (cached) return cached;

    const item = libraryStore.get().items.find(i => i.id === id);
    const blob = await storage.readFile(id, item?.mimeType ?? "");
    if (!blob) throw new Error("The audio file is missing");

    const url = URL.createObjectURL(blob);
    fileUrls.set(id, url);
    return url;
}

export const releaseFileUrl = (id: string) => revokeUrl(fileUrls, id);

function revokeUrl(urls: Map<string, string>, id: string) {
    const url = urls.get(id);
    if (!url) return;

    URL.revokeObjectURL(url);
    urls.delete(id);
}

export function revokeAllFileUrls() {
    for (const urls of [fileUrls, coverUrls]) {
        urls.forEach(url => URL.revokeObjectURL(url));
        urls.clear();
    }
}
