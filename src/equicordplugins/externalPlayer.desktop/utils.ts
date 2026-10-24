/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function mediaKey(url: string) {
    const parsed = URL.parse(url);
    return parsed && /^(cdn|media)\.discordapp\.(com|net)$/.test(parsed.host) ? parsed.pathname : url;
}

export function canOpen(url: string) {
    return URL.parse(url)?.protocol === "https:";
}
