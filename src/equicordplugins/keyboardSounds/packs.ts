/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const packs = {
    "OperaGX": {
        click1: new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/operagx/click1.wav"),
        click2: new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/operagx/click2.wav"),
        click3: new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/operagx/click3.wav"),
        backspace: new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/operagx/backspace.wav"),
        allowedKeys: []
    },
    "osu": {
        caps: new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-caps.mp3"),
        enter: new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-confirm.mp3"),
        backspace: new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-delete.mp3"),
        arrow: new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-movement.mp3"),
        click1: new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-press-1.mp3"),
        click2: new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-press-2.mp3"),
        click3: new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-press-3.mp3"),
        click4: new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-press-4.mp3"),
        allowedKeys: [
            "CapsLock",
            "ArrowUp",
            "ArrowRight",
            "ArrowLeft",
            "ArrowDown"
        ]
    }
};

export const ignoredKeys = [
    "CapsLock",
    "ShiftLeft",
    "ShiftRight",
    "ControlLeft",
    "ControlRight",
    "AltLeft",
    "AltRight",
    "MetaLeft",
    "MetaRight",
    "ArrowUp",
    "ArrowRight",
    "ArrowLeft",
    "ArrowDown",
    "MediaPlayPause",
    "MediaStop",
    "MediaTrackNext",
    "MediaTrackPrevious",
    "MediaSelect",
    "MediaEject",
    "MediaVolumeUp",
    "MediaVolumeDown",
    "AudioVolumeUp",
    "AudioVolumeDown"
];
