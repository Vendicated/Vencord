/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as wanakana from "wanakana";

import { getKanjiReading } from "./kanji";

const japaneseRegex = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const kanaRegex = /[\u3040-\u30ff]/;
const smallKanaRegex = /[ゃゅょャュョ]/;

const wordOverrides: Record<string, string> = {
    "こんにちは": "konnichiwa",
    "こんばんは": "konbanwa",
    "ありがとう": "arigatou",
    "おはよう": "ohayou",
    "おやすみ": "oyasumi",
    "いただきます": "itadakimasu",
    "お願いします": "onegaishimasu",
    "すみません": "sumimasen",
};

const charOverrides: Record<string, string> = {
    "を": "o",
};

export function containsJapanese(text: string): boolean {
    return japaneseRegex.test(text);
}

function isSmallKana(char: string): boolean {
    return smallKanaRegex.test(char);
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function getCharReading(char: string, nextChar: string, isLastInBlock: boolean): string {
    if (charOverrides[char]) return charOverrides[char];

    if (char === "は" && (isLastInBlock || !kanaRegex.test(nextChar)))
        return "wa";
    if (char === "へ" && (isLastInBlock || !kanaRegex.test(nextChar)))
        return "e";

    if (char === "っ" || char === "ッ") {
        if (!nextChar || !kanaRegex.test(nextChar)) return "っ";
        const nextReading = wanakana.toRomaji(nextChar);
        return nextReading ? nextReading[0] : "っ";
    }

    const reading = wanakana.toRomaji(char);
    return reading || char;
}

export interface RenderOptions {
    annotateKanji?: boolean;
    annotateKana?: boolean;
    readingPreference?: "kun" | "on";
}

export function renderRubyText(text: string, options: RenderOptions = {}): string {
    const {
        annotateKanji = true,
        annotateKana = true,
        readingPreference = "kun",
    } = options;

    if (wordOverrides[text]) {
        if (!annotateKana && !annotateKanji) return escapeHtml(text);
        return `<ruby>${text}<rt>${wordOverrides[text]}</rt></ruby>`;
    }

    let result = "";
    let i = 0;

    while (i < text.length) {
        const char = text[i];

        if (japaneseRegex.test(char)) {
            const jpStart = i;
            while (i < text.length && japaneseRegex.test(text[i])) {
                if (i + 1 < text.length && isSmallKana(text[i + 1])) {
                    i += 2;
                } else {
                    i += 1;
                }
            }
            const jpBlock = text.slice(jpStart, i);
            const isLast = i >= text.length || !japaneseRegex.test(text[i]);

            if (wordOverrides[jpBlock]) {
                if (!annotateKana && !annotateKanji) {
                    result += escapeHtml(jpBlock);
                } else {
                    result += `<ruby>${jpBlock}<rt>${wordOverrides[jpBlock]}</rt></ruby>`;
                }
                continue;
            }

            for (let j = 0; j < jpBlock.length; j++) {
                const c = jpBlock[j];
                const next = j + 1 < jpBlock.length ? jpBlock[j + 1] : "";
                const isLastInBlock = j === jpBlock.length - 1 && isLast;

                if (j + 1 < jpBlock.length && isSmallKana(jpBlock[j + 1])) {
                    const digraph = c + jpBlock[j + 1];
                    if (annotateKana) {
                        const reading = wanakana.toRomaji(digraph);
                        result += reading && reading !== digraph
                            ? `<ruby>${digraph}<rt>${reading}</rt></ruby>`
                            : escapeHtml(digraph);
                    } else {
                        result += escapeHtml(digraph);
                    }
                    j++;
                } else if (kanaRegex.test(c)) {
                    if (annotateKana) {
                        const reading = getCharReading(c, next, isLastInBlock);
                        result += reading !== c
                            ? `<ruby>${c}<rt>${reading}</rt></ruby>`
                            : escapeHtml(c);
                    } else {
                        result += escapeHtml(c);
                    }
                } else {
                    if (annotateKanji) {
                        const reading = getKanjiReading(c, readingPreference);
                        if (reading) {
                            result += `<ruby data-kanji="${c}">${c}<rt>${reading}</rt></ruby>`;
                        } else {
                            result += escapeHtml(c);
                        }
                    } else {
                        result += escapeHtml(c);
                    }
                }
            }
        } else {
            let end = i;
            while (end < text.length && !japaneseRegex.test(text[end])) {
                end++;
            }
            result += escapeHtml(text.slice(i, end));
            i = end;
        }
    }

    return result;
}
