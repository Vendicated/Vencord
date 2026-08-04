/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

import { type PersistedTimelineStateV1, validatePersistedState } from "./store";

export const HISTORY_KEY_PREFIX = "activity-timeline-history:";
const WRITE_DELAY_MS = 250;

export function historyKey(userId: string) {
    return `${HISTORY_KEY_PREFIX}${userId}`;
}

export async function loadHistory(userId: string) {
    const raw = await DataStore.get<unknown>(historyKey(userId));
    return validatePersistedState(raw);
}

let writeChain = Promise.resolve();
let pendingWrite: { userId: string; state: PersistedTimelineStateV1; onError?: (error: unknown) => void; } | undefined;
let writeTimer: ReturnType<typeof setTimeout> | undefined;

function enqueueWrite(userId: string, state: PersistedTimelineStateV1) {
    writeChain = writeChain.catch(() => undefined).then(() => DataStore.set(historyKey(userId), state));
    return writeChain;
}

function flushPending() {
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = undefined;
    const pending = pendingWrite;
    pendingWrite = undefined;
    const write = pending ? enqueueWrite(pending.userId, pending.state) : writeChain;
    return pending?.onError ? write.catch(error => {
        pending.onError?.(error);
        throw error;
    }) : write;
}

export function queueHistoryWrite(userId: string, state: PersistedTimelineStateV1, onError?: (error: unknown) => void) {
    pendingWrite = { userId, state, onError };
    if (!writeTimer)
        writeTimer = setTimeout(() => void flushPending().catch(() => undefined), WRITE_DELAY_MS);
    return writeChain;
}

export function flushHistoryWrite() {
    return flushPending();
}

export async function writeHistoryNow(userId: string, state: PersistedTimelineStateV1) {
    await flushPending();
    await enqueueWrite(userId, state);
}
