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

import { ApplicationCommandOptionType, sendBotMessage } from "@api/Commands";
import { ApplicationCommandInputType } from "@api/Commands/types";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "Dictionary",
    description: "Define a word using the Free Dictionary API. (api.dictionaryapi.dev)",
    authors: [],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "define",
            description: "Returns the definition of a word from Free Dictionary API",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    type: ApplicationCommandOptionType.STRING,
                    name: "word",
                    description: "The word to define",
                    required: true,
                },
            ],
            execute: async (args, ctx) => {
                try {
                    const query = encodeURIComponent(args[0].value);
                    const res = await (await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${query}`)).json();

                    const definition = res[0];
                    const fields = definition.meanings.map(meaning => ({
                        name: meaning.partOfSpeech.toUpperCase(),
                        value: "**Definitions**\n" + meaning.definitions.map(({ definition, example }, i) => {
                            let def = `${i + 1}. ${definition}`;
                            if (example) {
                                def += `\n - *${example}*`;
                            }
                            return def;
                        }).join("\n") +
                            (meaning.synonyms.length > 0 ? "\n**Synonyms**\n" + meaning.synonyms.join(", ") : "") +
                            (meaning.antonyms.length > 0 ? "\n**Antonyms**\n" + meaning.antonyms.join(", ") : ""),
                        inline: false,
                    }));

                    sendBotMessage(ctx.channel.id, {
                        embeds: [
                            {
                                type: "rich",
                                title: `${definition.word} \u2022 ${definition.phonetics
                                    .map(p => p?.text)
                                    .filter(Boolean)
                                    .join(" \u2022 ")}`,
                                fields: fields,
                                color: 0xc84e3e,
                                footer: {
                                    text: "Powered by Free Dictionary API",
                                    icon_url: "https://dictionaryapi.dev/favicon.ico",
                                },
                                timestamp: new Date().toISOString(),
                            },
                        ] as any,
                    });
                } catch (error) {
                    sendBotMessage(ctx.channel.id, {
                        content: `Something went wrong: \`${error}\``,
                    });
                }
            },
        },
    ],
});
