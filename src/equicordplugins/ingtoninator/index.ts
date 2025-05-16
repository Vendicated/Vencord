/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessagePreSendListener, MessageSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

const isLegal = (word: string) => {
    if (word.startsWith("<@")) return false;
    if (/^https?:\/\//i.test(word)) return false;
    return true;
};

const handleMessage: MessageSendListener = (channelId, message) => {
    if (!message.content || !message.content.trim()) return;

    const words = message.content.trim().split(/\s+/);
    if (words.length === 0) return;

    let index = -1;
    let attempts = 0;
    do {
        index = Math.floor(Math.random() * words.length);
        attempts++;
    } while (!isLegal(words[index]) && attempts < words.length * 2);

    if (isLegal(words[index])) {
        const word = words[index];
        words[index] = word === word.toUpperCase() ? word + "INGTON" : word + "ington";
    }

    message.content = words.join(" ");
};

export default definePlugin({
    name: "Ingtoninator",
    description: "Suffixes 'ington' to a random word in your message",
    authors: [EquicordDevs.zyqunix],
    start() {
        addMessagePreSendListener(handleMessage);
    },
    stop() {
        removeMessagePreSendListener(handleMessage);
    }
});
