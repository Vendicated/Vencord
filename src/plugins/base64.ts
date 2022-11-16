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
    name: "Base64",
    description: "Encodes / Decodes strings.",
    authors: [Devs.jewdev],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "encode",
            description: "Encode string to Base64.",
            inputType: ApplicationCommandInputType.BOT,
            options: [
                {
                    type: ApplicationCommandOptionType.STRING,
                    name: "string",
                    description: "The string you want to encode.",
                    required: true
                }
            ],
            execute: async (args, ctx) => {
                return void sendBotMessage(ctx.channel.id, {
                    content: btoa(args[0].value)
                });
            },
        },
        {
            name: "decode",
            description: "Decode Base64 string.",
            inputType: ApplicationCommandInputType.BOT,
            options: [
                {
                    type: ApplicationCommandOptionType.STRING,
                    name: "string",
                    description: "The string you want to decode.",
                    required: true
                }
            ],
            execute: async (args, ctx) => {
                return void sendBotMessage(ctx.channel.id, {
                    content: atob(args[0].value)
                });
            }
        }
    ]
});
