/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const CORS_PROXY = "https://cors.keiran0.workers.dev";

export function normalizeCorsProxyUrl(url?: string): string {
    return (url?.trim() || CORS_PROXY).replace(/\/+$/, "");
}

export function toProxiedUrl(url: string, corsProxyUrl = CORS_PROXY): string {
    return `${normalizeCorsProxyUrl(corsProxyUrl)}?url=${encodeURIComponent(url)}`;
}
