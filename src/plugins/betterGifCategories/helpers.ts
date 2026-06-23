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
    const href: string = props?.itemHref ?? props?.itemSrc ?? "";

    if (!href) {
        return false;
    }

    // Trust discords mediaItem content types. External gifs dont have this
    const contentType: string | undefined = props?.mediaItem?.contentType;

    if (contentType) {
        return contentType === "image/gif";
    }

    const safeSrc: string = props?.itemSafeSrc ?? "";

    if (/\.mp4(?:[?#]|$)/i.test(safeSrc)) {
        // Actual videos should already be caught by the contentTyper check
        return true;
    }

    try {
        if (new URL(safeSrc).searchParams.get("animated") === "true") return true;
    } catch {
        // malformed URL. fall through
    }

    // Direct .gif link with no mediaItem metadata.
    return /\.gif(?:[?#]|$)/i.test(safeSrc) || /\.gif(?:[?#]|$)/i.test(href);
}
