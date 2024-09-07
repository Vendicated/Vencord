/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import definePlugin, { OptionType } from "@utils/types";

function generateRandomString(length, isUpperCase = false) {
    const patterns = [
        "mraow", "mrow", "mew", "mrr", "purr", "raow", "rrow", "nya", "merp",
        "mee", "mewo", "meo", "mewmraow", "mraowmew", "mewmrow", "mraowmrow",
        "mewmraowmew", "mewmrrpurr", "nyamraow", "meomew", "nyamewo", "mrrpurrmew"
    ];

    let result = '';
    for (let i = 0; i < length; i++) {
        const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
        result += isUpperCase ? randomPattern.toUpperCase() : randomPattern;
    }
    return result;
}


export default definePlugin({
    name: "Auto Mrrp",
    description: "Uwuifies your messages on send!",
    authors: [{ name: "Yande", id: 1014588310036951120n }],
    dependencies: ["MessageAccessoriesAPI", "MessagePopoverAPI", "MessageEventsAPI", "ChatInputButtonAPI"],


    start() {



        this.preSend = addPreSendListener(async (_, message) => {
            if (!message.content) return;

            message.content = message.content.replace(/(mrrp|MRRP) (\d+)/g, (_, prefix, number) => {
                const isUpperCase = prefix === 'MRRP';
                return generateRandomString(Number(number), isUpperCase);
            });
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    },
});
