/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const FALLBACK_BUCKETS = 5;

export function avatar_url(user_id?: string, hash?: string | null): string {
    if (!user_id) return fallback(0);
    if (!hash) return fallback(parseInt(user_id, 10) % FALLBACK_BUCKETS);
    const ext = hash.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user_id}/${hash}.${ext}?size=80`;
}

function fallback(idx: number): string {
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png?size=80`;
}
