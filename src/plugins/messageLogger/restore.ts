/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { Message } from "@vencord/discord-types";
import { MessageCache, MessageStore } from "@webpack/common";

import { getCachedBlobUrl } from "./attachmentCache";
import { deserialize, deserializeEditHistory, getEntriesForChannel } from "./persistence";
import { PersistedMessage } from "./types";

const logger = new Logger("MessageLogger");

const DISCORD_EPOCH = 1_420_070_400_000n;

/** Snowflake ID → ms epoch. Pure function. */
export function snowflakeToMs(id: string): number {
    return Number((BigInt(id) >> 22n) + DISCORD_EPOCH);
}

/** Pick the chronologically-earliest snowflake from an array using BigInt compare. */
export function minSnowflake(ids: string[]): string | null {
    if (ids.length === 0) return null;
    let minId = ids[0];
    let minBig = BigInt(minId);
    for (let i = 1; i < ids.length; i++) {
        const big = BigInt(ids[i]);
        if (big < minBig) { minBig = big; minId = ids[i]; }
    }
    return minId;
}

/**
 * Build a real Message instance from a persisted entry, using a constructor we
 * grabbed from a live message in the same channel.
 */
async function restoreMessageInstance(entry: PersistedMessage, Ctor: any): Promise<Message> {
    const plain = deserialize(entry.message);
    if (entry.editHistory) plain.editHistory = deserializeEditHistory(entry.editHistory);
    if (entry.firstEditTimestamp != null) plain.firstEditTimestamp = new Date(entry.firstEditTimestamp);
    plain.deleted = entry.deleted;
    if (Array.isArray(plain.attachments)) {
        plain.attachments = await Promise.all(plain.attachments.map(async (a: any) => {
            if (typeof a?.id !== "string") return { ...a, deleted: entry.deleted };
            const blobUrl = await getCachedBlobUrl(a.id);
            if (!blobUrl) return { ...a, deleted: entry.deleted };
            // Fragment guard: Discord's image renderer appends `?format=webp&width=...&height=...`
            // to attachment URLs for resizing. Blob URLs key on the path (minus fragment), so a bare
            // `blob:.../<uuid>` becomes `blob:.../<uuid>?format=...` and fails ERR_FILE_NOT_FOUND.
            // With a `#mlcache` fragment, string-concat appends after the `#`, becoming
            // `blob:.../<uuid>#mlcache?format=...`. Browser treats everything after `#` as fragment;
            // path is still `<uuid>` so blob-store lookup resolves.
            const guarded = `${blobUrl}#mlcache`;
            return { ...a, url: guarded, proxy_url: guarded, deleted: entry.deleted };
        }));
    }
    return new Ctor(plain);
}

/**
 * Apply persisted entries for a channel to its live `MessageCache`.
 * Idempotent — re-running on the same channel is a no-op (all writes are
 * conditional on the entry not already being present in the cache).
 */
export async function applyEntriesToChannel(channelId: string): Promise<void> {
    try {
        const channelMessages = MessageStore.getMessages(channelId) as any;
        if (!channelMessages || channelMessages.loadingMore) return;
        const liveArr = (channelMessages._array as any[]) ?? [];
        if (liveArr.length === 0) return;

        const oldestId = minSnowflake(liveArr.map(m => m.id));
        if (!oldestId) return;
        const since = snowflakeToMs(oldestId);

        const entries = await getEntriesForChannel(channelId, { since });
        if (entries.length === 0) return;

        const Ctor = liveArr[0].constructor;
        let cache = (MessageCache as any).getOrCreate(channelId);
        let mutated = false;

        for (const entry of entries) {
            const live = (channelMessages._map as Record<string, Message> | undefined)?.[entry.id];
            if (live) {
                cache = cache.update(entry.id, (m: any) => {
                    if (m.editHistory && m.editHistory.length > 0) return m;
                    const history = deserializeEditHistory(entry.editHistory);
                    let next = m;
                    if (history) next = next.set("editHistory", history);
                    if (entry.firstEditTimestamp != null) {
                        next = next.set("firstEditTimestamp", new Date(entry.firstEditTimestamp));
                    }
                    return next;
                });
                mutated = true;
            } else if (entry.deleted) {
                if ((cache as any).has?.(entry.id)) continue;
                const instance = await restoreMessageInstance(entry, Ctor);
                cache = cache.receiveMessage(instance).update(entry.id, (m: any) => m
                    .set("deleted", true)
                    .set("attachments", (m.attachments ?? []).map((a: any) => ({ ...a, deleted: true }))));
                mutated = true;
            }
        }

        if (mutated) {
            (MessageCache as any).commit(cache);
            (MessageStore as any).emitChange();
        }
    } catch (e) {
        logger.error("applyEntriesToChannel failed for", channelId, e);
    }
}

// ---- flux handlers ----------------------------------------------------------

const recentlyApplied = new Map<string, number>();
const RECENT_THRESHOLD_MS = 250;

function shouldSkipDoubleApply(channelId: string): boolean {
    const last = recentlyApplied.get(channelId);
    if (last != null && Date.now() - last < RECENT_THRESHOLD_MS) return true;
    recentlyApplied.set(channelId, Date.now());
    return false;
}

/** Flux handler — exported for the plugin's `flux:` block. */
export async function onLoadMessagesSuccess({ channelId, messages }: { channelId: string; messages: any[]; }): Promise<void> {
    if (!messages || messages.length === 0) return;
    if (shouldSkipDoubleApply(channelId)) return;
    await applyEntriesToChannel(channelId);
}

/** Flux handler — exported for the plugin's `flux:` block. */
export async function onChannelSelect({ channelId }: { channelId: string | null; }): Promise<void> {
    if (!channelId) return;
    if (shouldSkipDoubleApply(channelId)) return;
    await applyEntriesToChannel(channelId);
}
