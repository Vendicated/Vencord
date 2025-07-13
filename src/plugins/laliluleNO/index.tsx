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

        FluxDispatcher.addInterceptor(e => {
            // if (e.type === 'MESSAGE_CREATE' || e.type === 'MESSAGE_UPDATE') {
            //     console.log(e.message.content)
            // } 

            if (e.type === 'LOAD_MESSAGES_SUCCESS') {
                e.messages.forEach((message, index) => {
                    message.content = blacklist.reduce(
                        (message, blacklisted_word) => message.replace(
                            new RegExp(blacklisted_word, "gi"),
                            "lalilulelo"
                        ),

                        message.content
                    );
                });
            }
        });
    }
});
