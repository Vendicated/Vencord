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
    }
});

export default definePlugin({
    name: "LaliluleNO",
    description: "Replace all blacklisted Messages with lalilulelo",
    authors: [Devs.Duckouji],
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

        FluxDispatcher.addInterceptor(e => {
            // if (e.type === 'MESSAGE_CREATE' || e.type === 'MESSAGE_UPDATE') {
            //     console.log(e.message.content)
            // } 

            if (e.type === 'LOAD_MESSAGES_SUCCESS') {
                e.messages.forEach((message, index) => {
                    let input_message = message.content;

                    // Leet mode support
                    if (settings.store.Leet) { input_message = leet_convert(input_message); }

                    // Replaces all the instances of the blacklisted word in the message
                    // With lalilulelo
                    message.content = blacklist.reduce(
                        (message, blacklisted_word) => message.replace(
                            new RegExp(blacklisted_word, "gi"),
                            "lalilulelo"
                        ),

                        input_message
                    );
                });
            }
        });
    }
});
