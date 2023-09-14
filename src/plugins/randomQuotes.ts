/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
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
            replacement: {
                match: /;(.{0,10}\._loadingText)=.+?random\(.+?;/s,
                replace: ";$self.quote().then(quoteText => $1 = quoteText);",
            },
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
                while (wikiQuote.indexOf("may refer to") > -1) {
                    data = await fetch("https://en.wikipedia.org/w/api.php?" + dataSearchParams).then(response => response.json());
                    wikiQuote = data.query.pages[0].extract;
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
        return fetch(url).then(res => res.json()).then(json => {
            if (url.indexOf("wiki") > -1) {
                currentQuote = json.query.pages[0].extract;
                while (currentQuote.indexOf("may refer to") > -1){
                    this.quote().then(returnedQuote => currentQuote = returnedQuote);
                }
                return currentQuote;
            }
            else {
                currentQuote = json.text;
                return currentQuote;
            }
        });
    }
});
