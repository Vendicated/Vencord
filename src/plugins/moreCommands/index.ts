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
import definePlugin from "@utils/types";


function mock(input: string): string {
    let output = "";
    for (let i = 0; i < input.length; i++) {
        output += i % 2 ? input[i].toUpperCase() : input[i].toLowerCase();
    }
    return output;
}

export default definePlugin({
    name: "MoreCommands",
    description: "echo, lenny, mock",
    authors: [Devs.Arjix, Devs.echo, Devs.Samu],
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
            description: "Translates text using mymemory's API. (Note: 50000 character limit per day)",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "to",
                    description: "Language to translate to. (Make sure to use the short name, like ru, en, it, etc.)",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "from",
                    description: "Language to translate from. (Make sure to use the short name, like ru, en, it, etc.)",
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
                    description: "Sends the translation to the current channel if True.",
                    type: ApplicationCommandOptionType.BOOLEAN,
                    required: false
                }
            ],
            execute: async (args) => {
                const channel_id = getCurrentChannel().id;
                const toLang = findOption(args, "to");
                const fromLang = findOption(args, "from")
                const text = findOption(args, "text");
                const send = findOption(args, "send");

                try {
                    const translatedText = await translateText(fromLang, toLang, text);
                    if (send) {
                        sendMessage(channel_id, { content: translatedText });
                    } else {
                        sendBotMessage(channel_id, { content: translatedText });
                    }
                } catch (error) {
                    sendBotMessage(channel_id, { content: `Oh no! There was an error whilst translating the message. Error: ${error}` });
                }
            }
        },
    ]
});
