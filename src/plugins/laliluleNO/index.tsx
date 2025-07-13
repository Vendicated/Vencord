/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 rini
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";

import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { FluxDispatcher } from "@webpack/common";

const settings = definePluginSettings({
    Blacklist: {
        type: OptionType.STRING,
        description: "What words will be replaced (add a comma in between)",
        default: "gregtech, gt, gtnh, greg"
    },

    Leet: {
        type: OptionType.BOOLEAN,
        description: "Leet Text Support",
        default: false
    },

    Embeds: {
        type: OptionType.BOOLEAN,
        description: "Message Embeds support",
        default: true
    }
});

export default definePlugin({
    name: "LaliluleNO",
    description: "Replace all blacklisted Messages with lalilulelo",
    authors: [Devs.Duckouji], // and davr1 the GOAT
    settings,
    start() {
        const blacklist = settings.store.Blacklist
            .split(",")
            .map((w) => w.trim())
            .filter(Boolean);

        function leet_convert(text: string) {
            const leet_to_letter = {
                "4": "a",
                "8": "b",
                "3": "e",
                "6": "g",
                "1": "i",
                "0": "o",
                "9": "p",
                "5": "s",
                "7": "t",
                "2": "z"
            };

            // This makes sure leet_convert only replace "word" tokens
            return text.replace(/\b[\w]+\b/g, word => {
                // Only process if the word contains at least one letter 
                // (not just digits or punctuation)
                if (!/[a-zA-Z]/.test(word)) return word;

                return [...text].map(char => leet_to_letter[char] || char).join('');
            });
        }

        function laliluleloify(input_text: string) {
            // Makes sure the input text is not null
            if (!input_text) return;

            // Leet mode support
            if (settings.store.Leet) { input_text = leet_convert(input_text); }

            // Replaces all the instances of the blacklisted word in the message
            // With lalilulelo
            return blacklist.reduce(
                (text, blacklisted_word) => text.replace(
                    new RegExp(blacklisted_word, "gi"),
                    "lalilulelo"
                ),

                input_text
            );
        }

        FluxDispatcher.addInterceptor(e => {
            // For individual messages sent/updated
            if (e.type === 'MESSAGE_CREATE' || e.type === 'MESSAGE_UPDATE') {
                e.message.content = laliluleloify(e.message.content);

                // Message embeds support
                if (settings.store.Embeds) {
                    e.message.embeds.forEach(embed => {
                        embed.title = laliluleloify(embed.title);
                    });
                }
            }

            // For all messages loaded at once (normally during startup)
            else if (e.type === 'LOAD_MESSAGES_SUCCESS') {
                e.messages.forEach((message) => {
                    message.content = laliluleloify(message.content);

                    // Message embeds support
                    if (settings.store.Embeds) {
                        message.embeds.forEach(embed => {
                            embed.title = laliluleloify(embed.title);
                        });
                    }
                });
            }
        });
    }
});
