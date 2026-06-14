/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

let kanaMap: Record<string, string> = {};
let mapReady = false;

const readyCallbacks: Array<() => void> = [];

export function onKanaReady(cb: () => void) {
    if (mapReady) {
        cb();
    } else {
        readyCallbacks.push(cb);
    }
}

export async function loadKanaMap(url: string) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        kanaMap = await res.json();
        mapReady = true;
        readyCallbacks.splice(0).forEach(cb => cb());
    } catch (e) {
        console.error("[JapaneseToRomaji] Failed to load kana map:", e);
        setTimeout(() => loadKanaMap(url), 30_000);
    }
}

export function toRomaji(text: string): string {
    if (!mapReady) return text;
    return kanaMap[text] || text;
}
