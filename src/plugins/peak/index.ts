/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findOption } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { MessageActions, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    peakThreshold: {
        type: OptionType.NUMBER,
        description: "How peak something has to be to trigger the reaction",
        default: 69,
        restartNeeded: false
    },
    autoReact: {
        type: OptionType.BOOLEAN,
        description: "Auto-react with 🐾 to messages that are peak",
        default: true,
        restartNeeded: false
    },
    peakEmoji: {
        type: OptionType.STRING,
        description: "Emoji to react with",
        default: "🐾",
        restartNeeded: false
    }
});

const MessageStore = findByPropsLazy("getMessages", "receiveMessage");

function ratePeak(text: string): number {
    // The Peak Algorithm™: totally scientific
    let score = 50;
    const peakWords = ["peak", "based", "fire", "goated", "goat", "legend", "sigma", "certified", "huge", "W", "absolute", "cinema", "perfect", "insane", "crazy", "aura"];
    const cringeWords = ["ratio", "mid", "cringe", "L", "boring", "trash", "ew", "cringe", "unbased", "cap", "copium"];

    const lower = text.toLowerCase();
    for (const w of peakWords) {
        if (lower.includes(w)) score += 7;
    }
    for (const w of cringeWords) {
        if (lower.includes(w)) score -= 8;
    }
    // longer messages are more effort = more peak
    score += Math.min(text.length / 10, 15);
    // ALL CAPS = peak energy
    if (text.length > 4 && text === text.toUpperCase()) score += 10;
    // emojis are peak
    const emojiCount = (text.match(/[\p{Extended_Pictographic}]/gu) || []).length;
    score += emojiCount * 3;

    return Math.max(0, Math.min(100, Math.round(score)));
}

const verdict = (score: number): string => {
    if (score >= 95) return "🏆 ABSOLUTE PEAK CINEMA";
    if (score >= 85) return "🔥 certified peak";
    if (score >= settings.store.peakThreshold) return "🐾 peak detected";
    if (score >= 50) return "😐 mid";
    return "💀 that was NOT peak";
};

export default definePlugin({
    name: "Peak",
    description: "Rates how peak messages are, with /peak command and optional auto-reactions. Trust the algorithm.",
    authors: [Devs.Ven, Devs.Claw],
    settings,


    commands: [
        {
            name: "peak",
            description: "Rate how peak something is with the Peak Algorithm™",
            options: [
                {
                    name: "text",
                    description: "The thing to rate",
                    required: true,
                    type: 3 // STRING
                }
            ],
            execute: args => {
                const text = findOption(args, "text", "") as string;
                const score = ratePeak(text);
                return {
                    content: `📊 **Peak Score: ${score}/100**\n${verdict(score)}\n\n> "${text.slice(0, 200)}"`
                };
            }
        }
    ],

    async start() {
        if (!settings.store.autoReact) return;
        this._react = (channelId: string, messageId: string, emoji: string) => {
            try {
                MessageActions._sendRequest(channelId, {
                    type: 7, // MESSAGE_REACTION_ADD
                    messageId,
                    emoji: { name: emoji, id: undefined }
                });
            } catch { /* silently ignore */ }
        };
    },

    stop() {
        this._react = null;
    },

    flux: {
        MESSAGE_CREATE({ message, channelId }: any) {
            if (!settings.store.autoReact || !message) return;
            if (message.author?.id === UserStore.getCurrentUser()?.id) return;
            if (message.content && ratePeak(message.content) >= settings.store.peakThreshold) {
                const emoji = settings.store.peakEmoji || "🐾";
                setTimeout(() => {
                    try {
                        MessageActions._sendRequest(channelId, {
                            type: 7,
                            messageId: message.id,
                            emoji: { name: emoji, id: undefined }
                        });
                    } catch { /* ignore */ }
                }, 1500);
            }
        }
    }
});
