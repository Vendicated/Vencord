/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const CORS_PROXY = "https://cors.keiran0.workers.dev";

export function toProxiedUrl(url: string): string {
    return `${CORS_PROXY}?url=${encodeURIComponent(url)}`;
}
