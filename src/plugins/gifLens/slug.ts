/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const STOPWORDS = new Set([
    "http", "https", "com", "net", "org", "www", "tenor", "giphy", "view",
    "media", "embed", "cdn", "attachments", "images", "image", "upload",
    "uploads", "content", "asset", "assets", "gif", "gifs", "mp4", "webm", "webp",
    "png", "jpg", "jpeg"
]);

export function extractSlugTokens(url: string, src?: string): string[] {
    const tokens = new Set<string>();

    const parseString = (raw: string) => {
        try {
            const parsed = new URL(raw);
            const pathSegments = parsed.pathname.split("/").filter(Boolean);

            for (const segment of pathSegments) {
                let cleaned = decodeURIComponent(segment);
                cleaned = cleaned.replace(/\.(gif|mp4|webm|webp|png|jpe?g)$/i, "");
                cleaned = cleaned.replace(/-gif-\d+$/i, "");
                cleaned = cleaned.replace(/-\d+$/i, "");
                cleaned = cleaned.replace(/-[a-z0-9]{6,}$/i, "");
                cleaned = cleaned.replace(/[_\-+%./\\]+/g, " ");

                const words = cleaned.toLowerCase().split(/\s+/).filter(Boolean);
                for (const word of words) {
                    if (word.length >= 2 && !STOPWORDS.has(word) && !/^[0-9a-f]{10,}$/i.test(word) && !/^\d+$/.test(word)) {
                        tokens.add(word);
                    }
                }
            }
        } catch {
            const words = raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter(Boolean);
            for (const word of words) {
                if (word.length >= 2 && !STOPWORDS.has(word) && !/^\d+$/.test(word)) {
                    tokens.add(word);
                }
            }
        }
    };

    if (url) parseString(url);
    if (src && src !== url) parseString(src);

    return Array.from(tokens);
}

export function getSlugString(url: string, src?: string): string {
    return extractSlugTokens(url, src).join(" ");
}
