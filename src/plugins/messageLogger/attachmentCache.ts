/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { PluginNative } from "@utils/types";

import { listAttachmentRecords } from "./persistence";

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
