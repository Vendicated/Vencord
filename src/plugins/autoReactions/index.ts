/*
 * AutoReactions plugin for Vencord
 * Automatically reacts to messages containing specified keywords with configured emojis.
 * Copyright (c) 2025 Ali
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { findByProps } from "@utils/webpack";

const MessageActionsPromise = findByProps("addReaction");
let MessageActions: any;

// Define your keyword-emoji rules here. The plugin will react with the emoji when any keyword is found.
const TRIGGERS = [
    {
        keywords: ["شكرًا", "thanks", "thx"],
        emoji: "❤️"
    },
    {
        keywords: ["مرحبًا", "hello", "hi"],
        emoji: "👋"
    }
];

export default definePlugin({
    name: "AutoReactions",
    description: "Automatically reacts to messages containing configured keywords with your chosen emojis.",
    authors: [{ name: "Ali", id: BigInt(0) }],

    async start() {
        // Wait for the MessageActions module to be available
        MessageActions = await MessageActionsPromise;
    },

    // Listen to Discord's flux dispatcher for new messages and add reactions when appropriate
    flux: {
        MESSAGE_CREATE(event: any) {
            if (!MessageActions) return;
            const msg = event.message ?? event;
            const content = (msg.content || "").toLowerCase();
            for (const rule of TRIGGERS) {
                if (rule.keywords.some((kw: string) => content.includes(kw.toLowerCase()))) {
                    try {
                        // The addReaction function accepts channelId, messageId, and the emoji
                        MessageActions.addReaction(msg.channel_id ?? msg.channelId, msg.id, rule.emoji);
                    } catch (err) {
                        console.error("AutoReactions: failed to add reaction", err);
                    }
                    break;
                }
            }
        }
    },

    stop() {
        // nothing to clean up, flux listeners are automatically removed
    }
});
