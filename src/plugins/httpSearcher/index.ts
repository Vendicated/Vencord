/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "HTTPSearcher",
    description: "Search HTTP error codes use http.cat",
    authors: [Devs.Syirezz],
    dependencies: ["CommandsAPI"],

    commands: [
        {
            name: "httpsearcher",
            description: "Search HTTP error codes",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "code",
                    description: "HTTP Error code for cat image",
                    type: ApplicationCommandOptionType.INTEGER,
                    required: true
                },
            ],
            execute: async (_, ctx) => {
                const httpError = findOption(_, "code", "");
                if (!httpError) {
                    return sendBotMessage(ctx.channel.id, {
                        content: "No http code was defined!"
                    });
                }

                return sendBotMessage(ctx.channel.id, {
                    content: `Image of http code ${httpError}:\nhttps://http.cat/${httpError}`,
                });
            }
        }
    ]

});

