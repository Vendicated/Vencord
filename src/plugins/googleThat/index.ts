/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandOptionType,findOption } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

function getMessage(opts)
{
    const inputOption = findOption(opts, "input", "");
    const queryURL = "https://www.google.com/search?q=" + encodeURIComponent(inputOption);
    if(settings.store.hyperlink)
    {
        return `[${inputOption}](${queryURL})`;
    }
    else
    {
        return queryURL;
    }
}

const settings = definePluginSettings({
    hyperlink: {
        type: OptionType.BOOLEAN,
        description: "If the sent link should hyperlink with the query as the label",
        default: true
    }
});

export default definePlugin({
    name: "GoogleThat",
    description: "Adds a command to send a google search link to a query",
    authors: [Devs.Samwich],
    dependencies: ["CommandsAPI"],
    settings,
    commands: [
        {
            name: "googlethat",
            description: "send a google search link to a query",
            options: [
                {
                    name: "input",
                    description: "The search query",
                    type: ApplicationCommandOptionType.STRING,
                    required: true,
                }],
            execute: opts => ({
                content: getMessage(opts)
            }),
        }
    ]
});
