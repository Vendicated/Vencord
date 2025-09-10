/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { sounds } from ".";

export const ignoredKeys = ["CapsLock", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight", "ArrowUp", "ArrowRight", "ArrowLeft", "ArrowDown", "MediaPlayPause", "MediaStop", "MediaTrackNext", "MediaTrackPrevious", "MediaSelect", "MediaEject", "MediaVolumeUp", "MediaVolumeDown", "AudioVolumeUp", "AudioVolumeDown"];

export const keydown = (e: KeyboardEvent) => {
    if (ignoredKeys.includes(e.code)) return;
    for (const sound of Object.values(sounds)) sound.pause();
    if (e.code === "Backspace") {
        sounds.backspace.currentTime = 0;
        sounds.backspace.play();
    } else {
        const click = sounds[`click${Math.floor(Math.random() * 3) + 1}`];
        click.currentTime = 0;
        click.play();
    }
};
