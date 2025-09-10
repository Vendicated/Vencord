/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "./settings";

export const MOYAI = "🗿";
export const MOYAI_URL = "https://github.com/Equicord/Equibored/raw/main/sounds/moyai/moyai.mp3";
export const MOYAI_URL_HD = "https://github.com/Equicord/Equibored/raw/main/sounds/moyai/moyai.wav";

export function countOccurrences(sourceString: string, subString: string) {
    let i = 0;
    let lastIdx = 0;
    while ((lastIdx = sourceString.indexOf(subString, lastIdx) + 1) !== 0)
        i++;

    return i;
}

export function countMatches(sourceString: string, pattern: RegExp) {
    if (!pattern.global)
        throw new Error("pattern must be global");

    let i = 0;
    while (pattern.test(sourceString))
        i++;

    return i;
}

export const customMoyaiRe = /<a?:\w*moy?ai\w*:\d{17,20}>/gi;

export function getMoyaiCount(message: string) {
    const count = countOccurrences(message, MOYAI)
        + countMatches(message, customMoyaiRe);

    return Math.min(count, 10);
}

export function boom() {
    if (!settings.store.triggerWhenUnfocused && !document.hasFocus()) return;
    const audioElement = document.createElement("audio");

    audioElement.src = settings.store.soundQuality !== "low"
        ? MOYAI_URL_HD
        : MOYAI_URL;

    audioElement.volume = settings.store.volume;
    audioElement.play();
}
