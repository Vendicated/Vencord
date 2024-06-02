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

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, OptionalMessageOption, RequiredMessageOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const translateText = async (sourceLang, targetLang, text) => {
    try {
        const url = "https://translate.googleapis.com/translate_a/single?" + new URLSearchParams({
            client: "gtx",
            sl: sourceLang,
            tl: targetLang,
            dt: "t",
            dj: "1",
            source: "input",
            q: text
        });
        const response = await fetch(url);
        const jsonResponse = await response.json();
        
        if (response.ok) {
            const translatedText = jsonResponse.sentences.map(sentence => sentence.trans).join('');
            return translatedText
        } else {
            throw new Error('Translation failed');
        }
    } catch (error) {
        throw new Error(`Error: ${error.message}`);
    }
};

function mock(input: string): string {
    let output = "";
    for (let i = 0; i < input.length; i++) {
        output += i % 2 ? input[i].toUpperCase() : input[i].toLowerCase();
    }
    return output;
}

export default definePlugin({
    name: "MoreCommands",
    description: "echo, lenny, mock, translate",
    authors: [Devs.Arjix, Devs.echo, Devs.Samu, {name: "Kai :3", id: 1205727693811879997n}],
    dependencies: ["CommandsAPI"],
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

                try {
                    const translationResult = await translateText(fromLang, toLang, text);

                    if (send) {
                        sendMessage(channel_id, { content: translationResult });
                    } else {
                        sendBotMessage(channel_id, { content: translationResult });
                    }
                } catch (error) {
                    sendBotMessage(channel_id, { content: `Oh no! There was an error whilst translating the message. Error: ${error.message}` });
                }
            }
        }
    ]
});
