/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function normalizeCorsProxyUrl(url?: string): string {
    return (url?.trim() ?? "").replace(/\/+$/, "");
}

export function toProxiedUrl(url: string, corsProxyUrl?: string): string {
    const proxy = normalizeCorsProxyUrl(corsProxyUrl);
    if (!proxy || proxy === "none") {
        return url;
    }
    return `${proxy}?url=${encodeURIComponent(url)}`;
}
