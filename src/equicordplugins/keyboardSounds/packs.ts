/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const packs = {
    "operagx": {
        others: [
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/operagx/click1.wav",
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/operagx/click2.wav",
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/operagx/click3.wav"
        ],
        backspaces: [
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/operagx/backspace.wav"
        ]
    },
    "osu": {
        others: [
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-press-1.mp3",
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-press-2.mp3",
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-press-3.mp3",
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-press-4.mp3"
        ],
        backspaces: [
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-delete.mp3"
        ],
        caps: [
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-caps.mp3"
        ],
        enters: [
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-confirm.mp3"
        ],
        arrows: [
            "https://github.com/Equicord/Equibored/raw/main/sounds/keyboardSounds/osu/key-movement.mp3"
        ],
        allowedIgnored: [
            "CapsLock",
            "ArrowUp",
            "ArrowRight",
            "ArrowLeft",
            "ArrowDown"
        ]
    }
} as Record<"operagx" | "osu", {
    others: string[];
    backspaces: string[];
    caps?: string[];
    enters?: string[];
    arrows?: string[];
    allowedIgnored?: string[];
}>;

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
