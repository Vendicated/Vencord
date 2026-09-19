/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { extractSlugTokens } from "./slug";
import type { Gif, IndexedGifRecord } from "./types";

export function normalizeArabic(text: string): string {
    if (!text) return "";
    return text
        .replace(/[\u064B-\u0652\u0640]/g, "")
        .replace(/[إأآا]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي");
}

function isSubsequence(pattern: string, text: string): boolean {
    let pIdx = 0;
    let tIdx = 0;
    while (pIdx < pattern.length && tIdx < text.length) {
        if (pattern[pIdx] === text[tIdx]) pIdx++;
        tIdx++;
    }
    return pIdx === pattern.length;
}

export function searchFavorites(
    query: string,
    favorites: Gif[],
    cache: Map<string, IndexedGifRecord>
): Gif[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return favorites;

    const normTrimmed = normalizeArabic(trimmed);
    const terms = trimmed.split(/\s+/).filter(Boolean);
    const normTerms = terms.map(t => normalizeArabic(t));
    const scored: { gif: Gif; score: number }[] = [];

    for (const gif of favorites) {
        const record = cache.get(gif.url);
        const ocr = (record?.ocrText ?? "").toLowerCase();
        const normOcr = normalizeArabic(ocr);
        const slugTokens = record?.slugTokens ?? extractSlugTokens(gif.url, gif.src);
        const slugStr = slugTokens.join(" ");

        let score = 0;

        if (ocr) {
            if (ocr.includes(trimmed) || (normTrimmed && normOcr.includes(normTrimmed))) {
                score += 180;
            }

            const ocrWords = ocr.split(/\s+/);
            const normOcrWords = normOcr.split(/\s+/);

            for (let i = 0; i < terms.length; i++) {
                const term = terms[i];
                const normTerm = normTerms[i];

                if (ocrWords.includes(term) || (normTerm && normOcrWords.includes(normTerm))) {
                    score += 80;
                } else if (ocr.includes(term) || (normTerm && normOcr.includes(normTerm))) {
                    score += 35;
                }
            }
        }

        if (slugStr.includes(trimmed)) {
            score += 120;
        }

        for (const term of terms) {
            for (const token of slugTokens) {
                if (token === term) {
                    score += 45;
                } else if (token.startsWith(term)) {
                    score += 25;
                } else if (token.includes(term)) {
                    score += 15;
                }
            }
        }

        if (score === 0) {
            const combined = `${ocr} ${slugStr}`;
            if (terms.length === 1 && isSubsequence(terms[0], combined)) {
                score += 10;
            }
        }

        if (score > 0) {
            scored.push({ gif, score });
        }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map(entry => entry.gif);
}
