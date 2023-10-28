/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
let currentQuote = "";
const settings = definePluginSettings({
    apiURL: {
        description: "Choose the API endpoint to use.",
        type: OptionType.SELECT,
        dependencies: ["CommandsAPI"],
        options: [
            {
                label: "Useless facts API. Gives you random useless but short facts.",
                value: "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en",
                default: true
            },
            {
                label: "Wikipedia API. Gives you random facts from all topics but these could be long.",
                value: "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({
                    action: "query",
                    prop: "extracts",
                    format: "json",
                    formatversion: "2",
                    exsentences: "2",
                    exsectionformat: "plain",
                    generator: "random",
                    grnnamespace: "0",
                    explaintext: "1",
                    origin: "*",
                })
            }
        ]
    },
    replaceEvents: {
        description: "Replace Event Quotes too",
        type: OptionType.BOOLEAN,
        default: true
    }
});
export default definePlugin({
    name: "RandomQuotes",
    description: "Replaces Discord's default loading quotes with random facts, don't enable it with any other plugin that modifies loading quotes like LoadingQuotes! Also adds slash commands: /wikirandomfact to get a random fact from wikipedia, /uselessrandomfact to get a random useless fact, and /currentrandomfact to get the fact that was shown in the loading quote in case you want to re-read it.",
    authors: [Devs.DarkRedTitan],
    settings,
    patches: [
        {
            find: ".LOADING_DID_YOU_KNOW",
            replacement: [
            {
                match: /,(.{0,10}\._loadingText)=function\(\)\{.+?\}\(\),/,
                replace: ",$self.quote().then(quoteText => $1 = quoteText),",
            },
            {
                match: /,(.{0,10}\._eventLoadingText)=function\(\)\{.+?\}\(\),/,
                replace: ",$self.quote().then(quoteText => $1 = quoteText),",
                predicate: () => settings.store.replaceEvents
            }
        ]
        },
    ],
    commands: [
        {
            name: "wikirandomfact",
            description: "Gets a random fact from Wikipedia.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "sentencesCount",
                    description: "Number of sentences, default is 2",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                },
            ],
            execute: async (_, ctx) => {
                const sentencesCount = findOption(_, "sentencesCount", "2");

                const dataSearchParams = new URLSearchParams({
                    action: "query",
                    prop: "extracts",
                    format: "json",
                    formatversion: "2",
                    exsentences: sentencesCount,
                    exsectionformat: "plain",
                    generator: "random",
                    grnnamespace: "0",
                    explaintext: "1",
                    origin: "*",
                });

                let data = await fetch("https://en.wikipedia.org/w/api.php?" + dataSearchParams).then(response => response.json())
                    .catch(err => {
                        console.log(err);
                        sendBotMessage(ctx.channel.id, { content: "There was an error. Check the console for more info" });
                        return null;
                    });

                if (!data) return;

                if (!data.query?.pages.length) {
                    console.log(data);
                    return sendBotMessage(ctx.channel.id, { content: "No results given" });
                }
                let wikiQuote = data.query.pages[0].extract;
                // Retry if the wiki random fact ends with ":" which means it is incomplete. Max 5 retries.
                for (let retryIndex=0; retryIndex < 5; retryIndex++) {
                    if (wikiQuote.endsWith(":")) {
                        data = await fetch("https://en.wikipedia.org/w/api.php?" + dataSearchParams).then(response => response.json());
                        wikiQuote = data.query.pages[0].extract;
                    }
                }
                return sendBotMessage(ctx.channel.id, { content: wikiQuote });
            },
        },
        {
            name: "uselessrandomfact",
            description: "Gets a useless random fact.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                const data = await fetch("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en").then(response => response.json())
                    .catch(err => {
                        console.log(err);
                        sendBotMessage(ctx.channel.id, { content: "There was an error. Check the console for more info" });
                        return null;
                    });

                if (!data) return;

                if (!data.text) {
                    console.log(data);
                    return sendBotMessage(ctx.channel.id, { content: "No results given" });
                }
                return sendBotMessage(ctx.channel.id, { content: data.text });
            },
        },
        {
            name: "currentrandomfact",
            description: "Gets the random fact that was shown in the loading screen.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {

                if (!currentQuote) {
                    return sendBotMessage(ctx.channel.id, { content: "No quote was fetched." });
                }
                return sendBotMessage(ctx.channel.id, { content: currentQuote });
            }
        }
    ],

    async quote() {
        const url = settings.store.apiURL;
        try {
            const json = await fetch(url).then(res => res.json());
            if (url.indexOf("wiki") > -1) {
                currentQuote = json.query.pages[0].extract;
            }
            else { currentQuote = json.text; }
        }
        catch(error) {
            console.log(error);
            currentQuote = "";
        }
        for (let retryIndex=0; retryIndex < 5; retryIndex++) {
            // Retry (max 5 retries) in the following cases:
            // currentQuote is empty which means no quote was fetched.
            // Wikipedia quote ends with ":" which means it is incomplete.
            if (currentQuote === "" || url.indexOf("wiki") > -1 && currentQuote.endsWith(":")) {
                try {
                    const data = await fetch(url).then(response => response.json());
                    currentQuote = data.query.pages[0].extract;
                }
                catch (error) {
                    console.log(error);
                    currentQuote = "";
                }
            }
        }
        return currentQuote;
    }
});
