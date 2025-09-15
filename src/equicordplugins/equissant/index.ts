/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let clickCount = 0;

function play() {
    clickCount++;

    const triggerAmount = settings.store.amount;

    if (clickCount % triggerAmount === 0) {
        const audio = new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/equissant/croissant.mp3");
        audio.play();
        clickCount = 0;
    }
}

const settings = definePluginSettings({
    amount: {
        type: OptionType.NUMBER,
        description: "amount of clicks to trigger crossant",
        default: 10,
    }
});

export default definePlugin({
    name: "Equissant",
    description: "Crossant every specified amount of clicks :trolley:",
    authors: [EquicordDevs.SomeAspy, Devs.thororen],
    settings,
    start() {
        document.addEventListener("click", play);
    },
    stop() {
        document.removeEventListener("click", play);
    }
});
