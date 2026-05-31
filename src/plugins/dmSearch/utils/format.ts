/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const DAY_MS = 86_400_000;

export function fmt_time(ts: string): string {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < DAY_MS) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < DAY_MS * 7) return d.toLocaleDateString([], { weekday: "short" });
    if (diff < DAY_MS * 365) return d.toLocaleDateString([], { day: "numeric", month: "short" });
    return d.toLocaleDateString();
}

export function fmt_bytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
