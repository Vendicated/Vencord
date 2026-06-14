/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Source: scriptin/jmdict-simplified (kanjidic2-en)

import * as wanakana from "wanakana";

export interface KanjiInfo {
    on: string[];
    kun: string[];
    meanings: string[];
}

interface KanjiDataEntry {
    o: string[];
    k: string[];
    m: string[];
}

let kanjiDict: Record<string, KanjiDataEntry> = {};

export let isDictReady = false;

const readyCallbacks: Array<() => void> = [];

export function onReady(cb: () => void) {
    if (isDictReady) {
        cb();
    } else {
        readyCallbacks.push(cb);
    }
}

export async function loadDict(url: string) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        kanjiDict = await res.json();
        isDictReady = true;
        readyCallbacks.splice(0).forEach(cb => cb());
    } catch (e) {
        console.error("[JapaneseToRomaji] Failed to load kanji dict:", e);
        setTimeout(() => loadDict(url), 30_000);
    }
}

const readingCache = new Map<string, string>();

export function lookupKanji(char: string): KanjiInfo | undefined {
    const entry = kanjiDict[char];
    if (!entry) return undefined;
    return {
        on: entry.o,
        kun: entry.k,
        meanings: entry.m,
    };
}

export function getKanjiReading(char: string, preference: "kun" | "on" = "kun"): string {
    if (!isDictReady) return "";

    const key = char + preference;
    const cached = readingCache.get(key);
    if (cached !== undefined) return cached;

    const info = kanjiDict[char];
    if (!info) {
        readingCache.set(key, "");
        return "";
    }

    if (preference === "on") {
        if (info.o.length > 0) {
            const reading = wanakana.toRomaji(info.o[0]);
            readingCache.set(key, reading);
            return reading;
        }
        if (info.k.length > 0) {
            const reading = wanakana.toRomaji(info.k[0]);
            readingCache.set(key, reading);
            return reading;
        }
    } else {
        if (info.k.length > 0) {
            const reading = wanakana.toRomaji(info.k[0]);
            readingCache.set(key, reading);
            return reading;
        }
        if (info.o.length > 0) {
            const reading = wanakana.toRomaji(info.o[0]);
            readingCache.set(key, reading);
            return reading;
        }
    }

    readingCache.set(key, "");
    return "";
}
