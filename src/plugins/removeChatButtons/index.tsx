/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    emojiButton: {
        type: OptionType.BOOLEAN,
        description: "Remove Emoji Button from chat",
        restartNeeded: true,
        default: false
    },
    stickerButton: {
        type: OptionType.BOOLEAN,
        description: "Remove Sticker Button from chat",
        restartNeeded: true,
        default: true
    },
    gifButton: {
        type: OptionType.BOOLEAN,
        description: "Remove GIF Button from chat",
        restartNeeded: true,
        default: true
    },
    giftButton: {
        type: OptionType.BOOLEAN,
        description: "Remove Gift Button from chat",
        restartNeeded: true,
        default: true
    },
    confettiButton: {
        type: OptionType.BOOLEAN,
        description: "Remove Confetti Button from chat",
        restartNeeded: true,
        default: true
    },
    TranslateModalButton: {
        type: OptionType.BOOLEAN,
        description: "Remove Translate Modal Button from chat (plugin)",
        restartNeeded: true,
        default: false
    },
    encryptMessageButton: {
        type: OptionType.BOOLEAN,
        description: "Remove Encrypt Message Button from chat (plugin)",
        restartNeeded: true,
        default: false
    },
});

export default definePlugin({
    name: "RemoveChatButtons",
    description: "Remove default and plugin buttons from the chat bar based on settings.",
    authors: [Devs.Mahiro],
    settings,

    start() {
        this.applyStyles();
    },

    stop() {
        document.querySelectorAll(".CustomChatButtons-style").forEach(style => style.remove());
    },

    applyStyles() {
        const css = this.generateCSS();
        const style = document.createElement("style");
        style.className = "CustomChatButtons-style";
        style.textContent = css;
        document.head.appendChild(style);
    },

    generateCSS() {
        const rules: string[] = [];

        // Using more reliable selectors that don't depend on webpack
        if (this.settings.store.emojiButton) {
            rules.push(`
                button[aria-label="Select emoji"] { display: none !important; }
                .expression-picker-chat-input-button[aria-label="Select emoji"] { display: none !important; }
            `);
        }

        if (this.settings.store.stickerButton) {
            rules.push(`
                button[aria-label="Open sticker picker"] { display: none !important; }
                .expression-picker-chat-input-button[aria-label="Open sticker picker"] { display: none !important; }
            `);
        }

        if (this.settings.store.gifButton) {
            rules.push(`
                button[aria-label="Open GIF picker"] { display: none !important; }
                .expression-picker-chat-input-button[aria-label="Open GIF picker"] { display: none !important; }
            `);
        }

        if (this.settings.store.giftButton) {
            rules.push(`
                button[aria-label="Send a gift"] { display: none !important; }
                .expression-picker-chat-input-button[aria-label="Send a gift"] { display: none !important; }
            `);
        }
        if (this.settings.store.confettiButton) {
            rules.push(`
                button[aria-label="Add Emoji Confetti"] { display: none !important; }
                .expression-picker-chat-input-button[aria-label="Add Emoji Confetti"] { display: none !important; }
            `);
        }
        if (this.settings.store.TranslateModalButton) {
            rules.push(`
                button[aria-label="Open Translate Modal"] { display: none !important; }
                .expression-picker-chat-input-button[aria-label="Open Translate Modal"] { display: none !important; }
            `);
        }
        if (this.settings.store.encryptMessageButton) {
            rules.push(`
                button[aria-label="Encrypt Message"] { display: none !important; }
                .expression-picker-chat-input-button[aria-label="Encrypt Message"] { display: none !important; }
            `);
        }

        return rules.join("\n");
    }
});
