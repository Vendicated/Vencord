/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

interface RetryOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    label?: string;
}

export async function callWithRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
    const {
        maxAttempts = 5,
        initialDelayMs = 500,
        maxDelayMs = 8_000,
        label = "request"
    } = opts;

    let attempt = 0;
    let delay = initialDelayMs;

    while (true) {
        attempt++;
        try {
            return await fn();
        } catch (err) {
            if (attempt >= maxAttempts) {
                console.error(`[Retry] ${label} failed after ${attempt} attempts`, err);
                throw err;
            }
            const retryAfterMs = getRetryAfterMs(err);
            const waitMs = retryAfterMs != null ? Math.max(retryAfterMs, initialDelayMs) : delay;
            console.warn(`[Retry] ${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${waitMs}ms`, err);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            delay = Math.min(maxDelayMs, Math.floor(waitMs * 2));
        }
    }
}

function getRetryAfterMs(err: any): number | undefined {
    const retryAfterSeconds =
        typeof err?.body?.retry_after === "number" ? err.body.retry_after :
            typeof err?.retry_after === "number" ? err.retry_after :
                undefined;
    if (retryAfterSeconds != null) return Math.max(0, retryAfterSeconds * 1000);

    const header = err?.headers?.get?.("Retry-After") ?? err?.response?.headers?.get?.("Retry-After");
    if (header != null) {
        const parsed = Number(header);
        if (!Number.isNaN(parsed)) return Math.max(0, parsed * 1000);
    }
    return undefined;
}
