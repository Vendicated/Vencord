/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Logger } from "@utils/Logger";

import { type MentionEntry,MentionIndex } from "./mentionIndex";

const logger = new Logger("MentionManager");

export const STORE_KEY = "mentionManager_index_v1";
const PERSIST_VERSION = 1;

interface PersistedIndex {
    version: number;
    entries: MentionEntry[];
}

function isValidEntry(e: any): e is MentionEntry {
    return !!e
        && typeof e.messageId === "string"
        && typeof e.channelId === "string"
        && typeof e.authorId === "string"
        && typeof e.timestamp === "number";
}

export async function loadIndex(index: MentionIndex): Promise<{ added: number; skipped: number; }> {
    try {
        const raw = await DataStore.get<PersistedIndex>(STORE_KEY);
        if (!raw) return { added: 0, skipped: 0 };
        if (raw.version !== PERSIST_VERSION || !Array.isArray(raw.entries)) {
            logger.warn(`Discarding persisted index with unsupported version/shape (v${(raw as any)?.version}). Backing up.`);
            await DataStore.set(`${STORE_KEY}_corrupt_${Date.now()}`, raw);
            await DataStore.del(STORE_KEY);
            return { added: 0, skipped: 0 };
        }
        const valid = raw.entries.filter(isValidEntry);
        if (valid.length !== raw.entries.length) {
            logger.warn(`Skipped ${raw.entries.length - valid.length} invalid persisted entries.`);
        }
        const res = index.load(valid);
        logger.info(`Loaded ${res.added} mentions from DataStore (${res.skipped} dupes skipped).`);
        return res;
    } catch (e) {
        logger.warn("Failed to load persisted index, starting empty.", e);
        return { added: 0, skipped: 0 };
    }
}

export async function saveIndex(index: MentionIndex): Promise<void> {
    try {
        const payload: PersistedIndex = { version: PERSIST_VERSION, entries: index.toJSON() };
        await DataStore.set(STORE_KEY, payload);
    } catch (e) {
        logger.warn("Failed to save mention index.", e);
    }
}

/** Trailing-edge debounced saver; call `.cancel()` on plugin stop. */
export function createDebouncedSaver(index: MentionIndex, delayMs = 2000): { schedule(): void; flush(): Promise<void>; cancel(): void; } {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => saveIndex(index);

    return {
        schedule() {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                void flush();
            }, delayMs);
        },
        async flush() {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            await flush();
        },
        cancel() {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        }
    };
}

export async function clearPersistedIndex(): Promise<void> {
    await DataStore.del(STORE_KEY);
}
