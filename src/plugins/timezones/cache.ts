/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { createStore } from "@api/DataStore";
import { debounce } from "@shared/debounce";
import { Logger } from "@utils/Logger";

import { fetchTimezone, fetchTimezonesBulk, Snowflake } from "./api";
import settings, { TimezoneOverwrites } from "./settings";

// TODO: cache invalidation
const TimezoneCache = createStore("UsersTimezoneCache", "TimezoneCache");

// A list of callbacks that will trigger on a completed debounced bulk fetch
type BulkFetchCallback = (timezone: string | null) => void;
type BulkFetchCallbacks = Record<Snowflake, (BulkFetchCallback)[]>;
let BulkFetchQueue: BulkFetchCallbacks = {};

// Executes all queued requests and calls their callbacks
const debounceProcessBulkQueue = debounce(processBulkQueue, 750);

async function processBulkQueue(attempt: number = 1, retryQueue?: BulkFetchCallbacks) {
    if (attempt > 3) {
        new Logger("Timezones").warn("Bulk queue fetch ran out of retries!");
        return;
    }

    const callbacks = retryQueue ?? BulkFetchQueue;
    if (!retryQueue) BulkFetchQueue = {};

    const timezones = await fetchTimezonesBulk(Object.keys(callbacks));
    if (!timezones) {
        const retry = processBulkQueue.bind(undefined, attempt + 1, callbacks);

        // Exponentially increasing timeout
        setTimeout(retry, 1000 * (3 ** attempt));
        return;
    }

    for (const [id, callbacksList] of Object.entries(callbacks)) {
        const timezone = timezones[id] ?? null;

        DataStore.set(id, timezone, TimezoneCache).catch(_ => _);
        callbacksList.forEach(c => c(timezone));
    }
}

export async function getUserTimezone(
    userId: Snowflake,
    immediate: boolean = false,
    force: boolean = false,
): Promise<string | null> {
    const overwrites = settings.store.timezoneOverwrites ?? {} as TimezoneOverwrites;
    const useApi = settings.store.enableApi;
    const overwrite = overwrites[userId];
    if (overwrite || !useApi) return overwrite ?? null;

    if (!force) {
        const cachedTimezone = await DataStore.get<string | null>(userId, TimezoneCache);

        if (cachedTimezone !== undefined)
            return cachedTimezone;
    }

    if (immediate) {
        let tries = 3;
        while (tries-- > 0) {
            const timezone = await fetchTimezone(userId);
            if (timezone === undefined) continue;

            DataStore.set(userId, timezone, TimezoneCache).catch(_ => _);
            return timezone;
        }

        new Logger("Timezones").warn("Immediate fetch ran out of retries!");
    }

    return new Promise(onResolve => {
        if (userId in BulkFetchQueue) {
            BulkFetchQueue[userId].push(onResolve);
        } else {
            BulkFetchQueue[userId] = [onResolve];
        }

        debounceProcessBulkQueue();
    });
}
