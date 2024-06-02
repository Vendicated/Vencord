/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated, Samu and contributors
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

import { ApplicationCommandInputType, findOption, OptionalMessageOption, RequiredMessageOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { definePluginSettings, OptionType } from "@utils/types";

const settings = definePluginSettings({
    show_match: {
        type: OptionType.BOOLEAN,
        description: "Shows a match number (like 0.85) to other sources.",
        default: false,
        restartNeeded: false,
    },
});

const translateText = async (sourceLang, targetLang, text) => {
    try {
        const url = `https://api.mymemory.translated.net/get?q=${text}&langpair=${sourceLang}|${targetLang}&de=translated-abuse@littlekai.co.uk`;
        const response = await fetch(url);
        const jsonResponse = await response.json();
        
        if (jsonResponse.responseStatus === 200) {
            const translatedText = jsonResponse.responseData.translatedText;
            const quotaFinished = jsonResponse.quotaFinished;
            const match = jsonResponse.responseData.match || 0;

            return {
                translated: translatedText,
                quotaFinished: quotaFinished,
                match: match
            };
        } else {
            throw new Error('Translation failed');
        }
    } catch (error) {
        throw new Error(`Error: ${error.message}`);
    }
};

function mock(input) {
    let output = "";
    for (let i = 0; i < input.length; i++) {
        output += i % 2 ? input[i].toUpperCase() : input[i].toLowerCase();
    }
    return output;
}

export default definePlugin({
    name: "MoreCommands",
    description: "echo, lenny, mock, translate",
    authors: [Devs.Arjix, Devs.echo, Devs.Samu],
    dependencies: ["CommandsAPI"],
    settings,
    commands: [
        {
            name: "echo",
            description: "Sends a message as Clyde (locally)",
            options: [OptionalMessageOption],
            inputType: ApplicationCommandInputType.BOT,
            execute: (opts, ctx) => {
                const content = findOption(opts, "message", "");

                sendBotMessage(ctx.channel.id, { content });
            },
        },
        {
            name: "lenny",
            description: "Sends a lenny face",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " ( ͡° ͜ʖ ͡°)"
            }),
        },
        {
            name: "mock",
            description: "mOcK PeOpLe",
            options: [RequiredMessageOption],
            execute: opts => ({
                content: mock(findOption(opts, "message", ""))
            }),
        },
        {
            name: "translate",
            description: "Translates a message using the MyMemory API.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "to",
                    description: "Language to translate to. (Use short names like ru, en, it, etc.)",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "from",
                    description: "Language to translate from. (Use short names like ru, en, it, etc.)",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "text",
                    description: "Text to translate.",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "send",
                    description: "Sends the translation to the current channel.",
                    type: ApplicationCommandOptionType.BOOLEAN,
                    required: false
                }
            ],
            execute: async (opts, ctx) => {
                const channel_id = ctx.channel.id;
                const toLang = findOption(opts, "to");
                const fromLang = findOption(opts, "from");
                const text = findOption(opts, "text");
                const send = findOption(opts, "send");
                const showMatch = settings.store.show_match

                try {
                    const translationResult = await translateText(fromLang, toLang, text);
                    
                    if (translationResult.quotaFinished) {
                        sendBotMessage(channel_id, { content: 'Oh no! Looks like you have run out of quota for today. Please try again tomorrow or use from another IP.' });
                        return;
                    }

                    let translatedMessage = translationResult.translated;
                    if (showMatch) {
                        translatedMessage += `\nMatch: ${translationResult.match}`;
                    }

                    if (send) {
                        sendMessage(channel_id, { content: translatedMessage });
                    } else {
                        sendBotMessage(channel_id, { content: translatedMessage });
                    }
                } catch (error) {
                    sendBotMessage(channel_id, { content: `Oh no! There was an error whilst translating the message. Error: ${error.message}` });
                }
            }
        }
    ]
});
