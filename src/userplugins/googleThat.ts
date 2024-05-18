/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandOptionType,findOption } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

function generateGoogleLink(query) {
    const modifiedQuery = encodeURIComponent(query);
    const googleLink = "https://www.google.com/search?q=" + modifiedQuery;
    return googleLink;
}

export default definePlugin({
    name: "GoogleThat",
    description: "Adds a command to send a google search link to something",
    authors: [ Devs.Samwich ],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "googlethat",
            description: "send a google search link to something",
            options: [
                {
                    name: "input",
                    description: "what you want the google search to link to",
                    type: ApplicationCommandOptionType.STRING,
                    required: true,
                }],
            execute: opts => ({
                content: generateGoogleLink(findOption(opts, "input", "")),
            }),
        }
    ]
});
