/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const URL_KEYWORDS = ["url", "src", "proxy"];
const URL_CONTAINER_KEYS = ["gif", "media", "image", "video", "thumbnail", "preview", "result", "item"];

export function normalizeUrl(url: string) {
    return url.startsWith("//") ? `https:${url}` : url;
}

export function looksLikeUrl(value: string) {
    return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("//");
}

export function collectCandidateUrls(source: unknown, depth = 0, out = new Set<string>()) {
    if (!source || depth > 2) return out;

    if (typeof source === "string") {
        if (looksLikeUrl(source)) out.add(normalizeUrl(source));
        return out;
    }

    if (Array.isArray(source)) {
        for (const entry of source) collectCandidateUrls(entry, depth + 1, out);
        return out;
    }

    if (typeof source !== "object") return out;

    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
        const keyLower = key.toLowerCase();

        if (typeof value === "string") {
            if (looksLikeUrl(value) && URL_KEYWORDS.some(keyword => keyLower.includes(keyword))) {
                out.add(normalizeUrl(value));
            }
            continue;
        }

        if (value && typeof value === "object" && URL_CONTAINER_KEYS.some(keyword => keyLower.includes(keyword))) {
            collectCandidateUrls(value, depth + 1, out);
        }
    }

    return out;
}

export function scoreUrl(url: string) {
    const { host } = new URL(url);

    let score = 0;
    if (host.endsWith("discordapp.net") || host.endsWith("discordapp.com")) score += 100;
    if (host.includes("images-ext")) score += 20;
    if (host.includes("media.discordapp.net") || host.includes("cdn.discordapp.com")) score += 10;
    if (host.endsWith("klipy.com")) score += 5;
    if (host.endsWith("tenor.com")) score += 5;

    return score;
}

function mediaExtScore(url: string) {
    const path = url.split(/[?#]/, 1)[0].toLowerCase();
    if (/\.(gif|webp|mp4|webm|m4v)$/.test(path)) return 2;
    if (/\.(png|jpe?g)$/.test(path)) return 1;
    return 0;
}

export function orderCandidateUrls(preferred: string | null, candidates: Set<string>) {
    return Array.from(candidates).sort((a, b) =>
        mediaExtScore(b) - mediaExtScore(a) ||
        (a === preferred ? -1 : b === preferred ? 1 : 0) ||
        scoreUrl(b) - scoreUrl(a)
    );
}

export function isLikelyVideoUrl(url: string) {
    return /\.(webm|mp4|m4v)(\?|$)/i.test(url);
}

export function ensureGifUrl(url: string): string {
    if (/\.gif(\?|$)/i.test(url)) return url;

    const parsed = new URL(url);
    const host = parsed.hostname;

    // verified against the live CDNs (2026-10): tenor ignores the filename and picks the
    // format by the id segment's suffix key (mp4 "Po" -> gif "d", thumbnail "P1" -> "AM");
    // giphy ids are the last dash-separated group of the page path (i.giphy.com/<id>.gif)
    if (host.includes("tenor.com")) {
        const segs = parsed.pathname.split("/").filter(Boolean);
        const file = segs[segs.length - 1];
        if (!file || !/\.mp4$/i.test(file)) return url;

        const id = segs[segs.length - 2];
        const gifId = id.replace(/Po$/, "d").replace(/P1$/, "AM");
        if (gifId === id) return url;

        segs[segs.length - 2] = gifId;
        segs[segs.length - 1] = file.replace(/\.mp4$/i, ".gif");
        parsed.pathname = "/" + segs.join("/");
        return parsed.href;
    }

    if (host.includes("giphy.com")) {
        const last = parsed.pathname.split("/").filter(Boolean).pop();
        const gifId = last?.split("-").pop() ?? "";
        if (/^[A-Za-z0-9]{10,}$/.test(gifId)) return `https://i.giphy.com/${gifId}.gif`;
        return url;
    }

    return url;
}

export function stripDiscordFormatParam(url: string): string {
    const parsed = new URL(url);
    if (/discord(app)?\.(com|net|gg)/i.test(parsed.hostname)) {
        parsed.searchParams.delete("format");
        parsed.searchParams.delete("animated");
        parsed.searchParams.delete("width");
        parsed.searchParams.delete("height");
    }
    return parsed.href;
}
