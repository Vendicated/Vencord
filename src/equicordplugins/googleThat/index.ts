/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandOptionType, findOption } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
function getMessage(opts) {
    const inputOption = findOption(opts, "input", "");

    const queryURL = "" + searchEngines[settings.store.defaultEngine] + encodeURIComponent(inputOption);

    if (settings.store.hyperlink) {
        return `[${inputOption}](${queryURL})`;
    }
    else {
        return queryURL;
    }
}

const searchEngines = {
    "Google": "https://www.google.com/search?q=",
    "Bing": "https://www.bing.com/search?q=",
    "Yahoo": "https://search.yahoo.com/search?p=",
    "DuckDuckGo": "https://duckduckgo.com/?q=",
    "Baidu": "https://www.baidu.com/s?wd=",
    "Yandex": "https://yandex.com/search/?text=",
    "Ecosia": "https://www.ecosia.org/search?q=",
    "Ask": "https://www.ask.com/web?q=",
    "LetMeGoogleThatForYou": "https://letmegooglethat.com/?q="
};

const settings = definePluginSettings({
    hyperlink: {
        type: OptionType.BOOLEAN,
        description: "If the sent link should hyperlink with the query as the label",
        default: true
    },
    defaultEngine:
    {
        type: OptionType.SELECT,
        description: "The search engine to use",
        options: Object.keys(searchEngines).map((key, index) => ({
            label: key,
            value: key,
            default: index === 0
        }))
    }
});

export default definePlugin({
    name: "GoogleThat",
    description: "Adds a command to send a google search link to a query",
    authors: [Devs.Samwich],
    tags: ["search", "google", "query", "duckduckgo", "command"],
    settings,
    commands: [
        {
            name: "googlethat",
            description: "send a search engine link to a query",
            options: [
                {
                    name: "input",
                    description: "The search query",
                    type: ApplicationCommandOptionType.STRING,
                    required: true,
                }
            ],
            execute: opts => ({
                content: getMessage(opts)
            }),
        }
    ]
});
