/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

let clickCount = 0;

export function croissant() {
    clickCount++;

    if (clickCount % 10 === 0) {
        const audio = new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/equissant/croissant.mp3");
        audio.play();
    }
}
