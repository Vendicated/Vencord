/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { PluginNative } from "@utils/types";

import {
    clearAttachmentRecords,
    evictAttachmentsOldestFirst,
    getAttachmentRecord,
    listAttachmentRecords,
    putAttachmentRecord,
} from "./persistence";

const logger = new Logger("MessageLogger");

const useNative = (typeof IS_DISCORD_DESKTOP !== "undefined" && IS_DISCORD_DESKTOP)
    || (typeof IS_VESKTOP !== "undefined" && IS_VESKTOP);

// `VencordNative.pluginHelpers.MessageLogger` is wired up automatically because this
// plugin has a sibling `native.ts`. The cast resolves to the exported native API.
const Native = useNative
    ? (VencordNative.pluginHelpers.MessageLogger as PluginNative<typeof import("./native")>)
    : null;

interface Settings {
    enabled: boolean;
    images: boolean;
    videos: boolean;
    audio: boolean;
    other: boolean;
    perFileCapBytes: number;
    totalCapBytes: number;
}

let settingsRef: () => Settings = () => ({
    enabled: false, images: true, videos: false, audio: false, other: false,
    perFileCapBytes: 5 * 1024 * 1024, totalCapBytes: 250 * 1024 * 1024,
});

/**
 * Wire in a settings accessor at plugin start time. Avoids a circular dependency
 * between this module and `index.tsx`'s settings store.
 */
export function configureSettings(getter: () => Settings): void {
    settingsRef = getter;
}

let currentTotalBytes = 0;
let initialized = false;
let quotaExceeded = false;
const blobUrlCache = new Map<string, string>();
/** IDs currently being downloaded — guards against duplicate dispatches racing the IDB dedup check. */
const inProgress = new Set<string>();

// ---- concurrency limiter ----------------------------------------------------

const MAX_IN_FLIGHT = 3;
let inFlight = 0;
const backlog: (() => void)[] = [];

function acquireSlot(): Promise<void> {
    return new Promise(resolve => {
        if (inFlight < MAX_IN_FLIGHT) {
            inFlight++;
            resolve();
        } else {
            backlog.push(() => { inFlight++; resolve(); });
        }
    });
}

function releaseSlot(): void {
    inFlight--;
    const next = backlog.shift();
    if (next) next();
}

// ---- init / shutdown --------------------------------------------------------

export async function init(): Promise<void> {
    if (initialized) return;
    initialized = true;
    quotaExceeded = false;
    currentTotalBytes = 0;
    try {
        if (useNative && Native) {
            const list = await Native.listAttachments();
            for (const f of list) currentTotalBytes += f.size;
        } else {
            const recs = await listAttachmentRecords();
            for (const r of recs) currentTotalBytes += r.size;
        }
    } catch (e) {
        logger.error("attachmentCache.init failed to compute total size", e);
    }
}

export function shutdown(): void {
    for (const url of blobUrlCache.values()) {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    }
    blobUrlCache.clear();
    initialized = false;
}

// ---- type filtering ---------------------------------------------------------

type Bucket = "images" | "videos" | "audio" | "other";

function bucketFor(att: any): Bucket {
    const ct = String(att.content_type ?? "").toLowerCase();
    if (ct.startsWith("image/")) return "images";
    if (ct.startsWith("video/")) return "videos";
    if (ct.startsWith("audio/")) return "audio";
    const fn = String(att.filename ?? "").toLowerCase();
    if (/\.(png|jpe?g|gif|webp|bmp|avif|tiff?)$/.test(fn)) return "images";
    if (/\.(mp4|webm|mov|mkv|m4v|avi)$/.test(fn)) return "videos";
    if (/\.(mp3|ogg|wav|flac|m4a|opus)$/.test(fn)) return "audio";
    return "other";
}

function bucketEnabled(b: Bucket, s: Settings): boolean {
    return s[b];
}

// ---- eviction ---------------------------------------------------------------

async function evictUntilUnderCap(needed: number, totalCapBytes: number): Promise<void> {
    if (currentTotalBytes + needed <= totalCapBytes) return;
    const toFree = (currentTotalBytes + needed) - totalCapBytes;
    let freed = 0;
    const evictedIds: string[] = [];
    const bytesFreed = await evictAttachmentsOldestFirst(rec => {
        if (freed >= toFree) return false;
        evictedIds.push(rec.id);
        freed += rec.size;
        return true;
    });
    currentTotalBytes -= bytesFreed;
    if (currentTotalBytes < 0) currentTotalBytes = 0;
    if (useNative && Native) {
        for (const id of evictedIds) {
            try { await Native.deleteAttachment(id); } catch { /* ignore */ }
        }
    }
    for (const id of evictedIds) {
        const url = blobUrlCache.get(id);
        if (url) {
            try { URL.revokeObjectURL(url); } catch { /* ignore */ }
            blobUrlCache.delete(id);
        }
    }
}

// ---- capture pipeline -------------------------------------------------------

/**
 * Look at a deleted message and queue downloads for matching attachments.
 * Fire-and-forget by design — never blocks the delete-handling path.
 */
export function tryCacheFromMessage(message: any): void {
    if (!initialized) { logger.debug("tryCacheFromMessage: not initialized"); return; }
    if (quotaExceeded) { logger.debug("tryCacheFromMessage: quota exceeded for session"); return; }
    const s = settingsRef();
    if (!s.enabled) { logger.debug("tryCacheFromMessage: cacheAttachmentsEnabled is off"); return; }
    const atts = message?.attachments;
    if (!Array.isArray(atts) || atts.length === 0) {
        logger.debug("tryCacheFromMessage: no attachments on message", message?.id);
        return;
    }
    logger.info("tryCacheFromMessage:", atts.length, "attachment(s) on message", message?.id);
    for (const att of atts) {
        if (!att || typeof att.id !== "string" || typeof att.url !== "string") {
            logger.debug("skip attachment: missing id/url", att);
            continue;
        }
        const bucket = bucketFor(att);
        if (!bucketEnabled(bucket, s)) {
            logger.debug("skip attachment: bucket disabled", att.id, bucket);
            continue;
        }
        const declaredSize = typeof att.size === "number" ? att.size : 0;
        if (declaredSize > 0 && declaredSize > s.perFileCapBytes) {
            logger.debug("skip attachment: over per-file cap", att.id, declaredSize, ">", s.perFileCapBytes);
            continue;
        }
        if (inProgress.has(att.id)) {
            logger.debug("skip attachment: already in progress", att.id);
            continue;
        }
        inProgress.add(att.id);
        logger.info("queuing attachment download", att.id, bucket, "size~=", declaredSize);
        void downloadOne(att, s)
            .catch(e => logger.error("downloadOne failed for", att.id, e))
            .finally(() => { inProgress.delete(att.id); });
    }
}

async function downloadOne(att: any, s: Settings): Promise<void> {
    await acquireSlot();
    try {
        // Dedup: already cached?
        const existing = await getAttachmentRecord(att.id);
        if (existing) return;

        const resp = await fetch(att.url);
        if (!resp.ok) {
            logger.warn("attachment fetch non-ok", att.id, resp.status);
            return;
        }
        const buf = await resp.arrayBuffer();
        if (buf.byteLength > s.perFileCapBytes) {
            logger.debug("attachment exceeds per-file cap; skipping", att.id, buf.byteLength);
            return;
        }
        await evictUntilUnderCap(buf.byteLength, s.totalCapBytes);

        const contentType = String(att.content_type ?? resp.headers.get("content-type") ?? "application/octet-stream");
        const filename = String(att.filename ?? att.id);
        const firstSeenAt = Date.now();

        if (useNative && Native) {
            await Native.writeAttachment(att.id, new Uint8Array(buf));
            await putAttachmentRecord({ id: att.id, firstSeenAt, contentType, size: buf.byteLength, filename });
        } else {
            const blob = new Blob([buf], { type: contentType });
            try {
                await putAttachmentRecord({ id: att.id, firstSeenAt, contentType, size: buf.byteLength, filename, blob });
            } catch (e: any) {
                if (e?.name === "QuotaExceededError" || /quota/i.test(String(e))) {
                    quotaExceeded = true;
                    logger.warn("attachment cache quota exceeded; further writes disabled until cache is cleared");
                    return;
                }
                throw e;
            }
        }
        currentTotalBytes += buf.byteLength;
        logger.info("cached attachment", att.id, "size", buf.byteLength, "totalBytes", currentTotalBytes);
    } catch (e) {
        logger.error("downloadOne errored", att?.id, e);
    } finally {
        releaseSlot();
    }
}

// ---- read path --------------------------------------------------------------

/**
 * Returns a `blob:` URL for the cached attachment, or null if not cached.
 * Memoizes the URL for the lifetime of the plugin (revoked on shutdown / evict).
 */
export async function getCachedBlobUrl(attachmentId: string): Promise<string | null> {
    if (!initialized) return null;
    const memo = blobUrlCache.get(attachmentId);
    if (memo) return memo;
    try {
        if (useNative && Native) {
            const rec = await getAttachmentRecord(attachmentId);
            if (!rec) return null;
            const bytes = await Native.readAttachment(attachmentId);
            if (!bytes) return null;
            const blob = new Blob([bytes], { type: rec.contentType });
            const url = URL.createObjectURL(blob);
            blobUrlCache.set(attachmentId, url);
            return url;
        } else {
            const rec = await getAttachmentRecord(attachmentId);
            if (!rec || !rec.blob) return null;
            const url = URL.createObjectURL(rec.blob);
            blobUrlCache.set(attachmentId, url);
            return url;
        }
    } catch (e) {
        logger.error("getCachedBlobUrl failed", attachmentId, e);
        return null;
    }
}

// ---- clearAll ---------------------------------------------------------------

export async function clearAll(): Promise<void> {
    for (const url of blobUrlCache.values()) {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    }
    blobUrlCache.clear();
    if (useNative && Native) {
        try { await Native.clearAllAttachments(); } catch (e) { logger.error("native clearAllAttachments failed", e); }
    }
    await clearAttachmentRecords();
    currentTotalBytes = 0;
    quotaExceeded = false;
}
