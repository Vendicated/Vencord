/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UserStore } from "@webpack/common/stores";

import type { Gif } from "./data";

export function makeId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function getDataKey(): string {
    return `BetterGifCategories_${UserStore.getCurrentUser().id}`;
}

export function gifKey(gif: Gif): string {
    return gif.url || gif.src;
}

export function isGifMedia(props: any): boolean {
    const safeSrc: string = props?.itemSafeSrc ?? "";

    if (!safeSrc) {
        return false;
    }

    // Gifs proxied as mp4
    if (/\.mp4(?:[?#]|$)/i.test(safeSrc)) {
        return true;
    }

    // Some embeds (like vxtwitter) may serve animated WebP with an explicit flag
    try {
        if (new URL(safeSrc).searchParams.get("animated") === "true") return true;
    } catch {
        // malformed URL. fall through
    }

    // Fallback for direct .gif file attachments (cdn.discordapp.com/attachments/...)
    return /\.gif(?:[?#]|$)/i.test(props?.itemSrc ?? props?.itemHref ?? "");
}
