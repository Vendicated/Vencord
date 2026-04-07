/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageObject } from "@api/MessageEvents";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "BetterTikTokEmbeds",
    description: "Automatically changes all tiktok.com links to tnktok.com for much better video embeds",
    authors: [{ name: "Olykir", id: 621154191192096778n }],

    onBeforeMessageSend(_channelId: string, message: MessageObject) {
        if (!message.content) return;

        message.content = message.content
            .replace(/https?:\/\/(?:www\.)?tiktok\.com/gi, "https://tnktok.com")
            .replace(/https?:\/\/vm\.tiktok\.com/gi, "https://tnktok.com");
    },

    onBeforeMessageEdit(_channelId: string, _messageId: string, message: MessageObject) {
        if (!message.content) return;

        message.content = message.content
            .replace(/https?:\/\/(?:www\.)?tiktok\.com/gi, "https://tnktok.com")
            .replace(/https?:\/\/vm\.tiktok\.com/gi, "https://tnktok.com");
    },

    start() {
        const rewriteVisibleLinks = () => {
            document.querySelectorAll<HTMLAnchorElement>('a[href*="tiktok.com"]').forEach(link => {
                let href = link.getAttribute("href") || "";

                href = href
                    .replace(/https?:\/\/(?:www\.)?tiktok\.com/gi, "https://tnktok.com")
                    .replace(/https?:\/\/vm\.tiktok\.com/gi, "https://tnktok.com");

                link.setAttribute("href", href);

                if (link.textContent) {
                    link.textContent = link.textContent.replace(/tiktok\.com/gi, "tnktok.com");
                }
            });
        };

        const observer = new MutationObserver(rewriteVisibleLinks);
        observer.observe(document.body, { childList: true, subtree: true });
        rewriteVisibleLinks();

        return () => observer.disconnect();
    }
});
