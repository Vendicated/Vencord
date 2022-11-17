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

import { ApplicationCommandOptionType, sendBotMessage } from "../api/Commands";
import { ApplicationCommandInputType } from "../api/Commands/types";
import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "Dictionary",
    description: "Searches for a word in the dictionary.",
    authors: [Devs.jewdev],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "define",
            description: "Returns the definition of a word.",
            inputType: ApplicationCommandInputType.BOT,
            options: [
                {
                    type: ApplicationCommandOptionType.STRING,
                    name: "word",
                    description: "The word you want to define.",
                    required: true
                }
            ],
            execute: async (args, ctx) => {
                try {
                    const json = await (await fetch(`https://api.urbandictionary.com/v0/define?term=${args[0].value}`)).json();

                    return void sendBotMessage(ctx.channel.id, {
                        content: `Definition of **${json.list[0].word}**:\n\`\`\`${json.list[0].definition}\`\`\`\nExample:\n\`\`\`${json.list[0].example}\`\`\``
                    });
                } catch (error) {
                    return void sendBotMessage(ctx.channel.id, {
                        content: `Something went wrong: \`${error}\``
                    });
                }
            },
        }
    ]
});
