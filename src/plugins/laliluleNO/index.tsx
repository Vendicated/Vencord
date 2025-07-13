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
        default: true
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

        const leet_alphabet = {
            a: "4",
            b: "8",
            e: "3",
            g: "6",
            i: "1",
            o: "0",
            p: "9",
            s: "5",
            t: "7",
            z: "2"
        };

        function leet_convert(text: string) {
            for (let [letter, number] of Object.entries(leet_alphabet)) {
                // Required as .replace() only replaces the first instance
                let global_regex = new RegExp(number, 'g');

                text = text.toLowerCase().replace(global_regex, letter);
            }

            return text;
        }

        function laliluleloify(message: string) {
            // Leet mode support
            if (settings.store.Leet) { message = leet_convert(message); }

            // Replaces all the instances of the blacklisted word in the message
            // With lalilulelo
            return blacklist.reduce(
                (message, blacklisted_word) => message.replace(
                    new RegExp(blacklisted_word, "gi"),
                    "lalilulelo"
                ),

                message
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
