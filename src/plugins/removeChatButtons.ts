/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let styleGift: HTMLStyleElement;
let styleGif: HTMLStyleElement;
let styleSticker: HTMLStyleElement;
let styleEmoji: HTMLStyleElement;

const settings = definePluginSettings({
    removeGift: {
        description: "Hide the 'gift' button",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true,
    },
    removeGif: {
        description: "Hide the 'GIF' button",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true,
    },
    removeSticker: {
        description: "Hide the 'sticker' button",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true,
    },
    removeEmoji: {
        description: "Hide the 'emoji' button",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true,
    },
});

export default definePlugin({
    name: "RemoveChatButtons",
    description: "Hide specific buttons from the chat input bar",
    authors: [Devs.Astrid],
    settings,

    start() {
        if (settings.store.removeGift) {
            styleGift = document.createElement("style");
            styleGift.id = "VcRemoveChatButtonsGift";
            styleGift.textContent =
                "button[aria-label='Send a gift'] { display: none; }";
            document.head.appendChild(styleGift);
        }
        if (settings.store.removeGif) {
            styleGif = document.createElement("style");
            styleGif.id = "VcRemoveChatButtonsGif";
            styleGif.textContent =
                "button[aria-label='Open GIF picker'] { display: none; }";
            document.head.appendChild(styleGif);
        }
        if (settings.store.removeSticker) {
            styleSticker = document.createElement("style");
            styleSticker.id = "VcRemoveChatButtonsSticker";
            styleSticker.textContent =
                "button[aria-label='Open sticker picker'] { display: none; }";
            document.head.appendChild(styleSticker);
        }
        if (settings.store.removeEmoji) {
            styleEmoji = document.createElement("style");
            styleEmoji.id = "VcRemoveChatButtonsEmoji";
            styleEmoji.textContent =
                "button[aria-label='Select emoji'] { display: none; }";
            document.head.appendChild(styleEmoji);
        }
    },

    stop() {
        styleGift?.remove();
        styleGif?.remove();
        styleSticker?.remove();
        styleEmoji?.remove();
    },
});
