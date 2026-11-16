/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const VIDEO_ID = /^[\w-]{11}$/;

export const isVideoId = (id: unknown): id is string => typeof id === "string" && VIDEO_ID.test(id);

export function youTubeVideoId(link: string) {
    if (typeof link !== "string") return null;
    const text = link.trim();
    let url: URL;
    try {
        url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    } catch {
        return null;
    }

    const host = url.hostname.replace(/^(www|m|music)\./, "");
    const id = host === "youtu.be" ? url.pathname.slice(1)
        : host === "youtube.com" ? url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|live)\/([\w-]+)/)?.[1]
            : undefined;

    return isVideoId(id) ? id : null;
}
