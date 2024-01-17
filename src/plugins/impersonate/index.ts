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
import { Devs } from "@utils/constants";

export default definePlugin({
    name: "Impersonate",
    description: "Impersonate a user and have them send a \"message\".",
    authors: [Devs.Airbus],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "impersonate",
            description: "Impersonate a user.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    type: ApplicationCommandOptionType.USER,
                    name: "user",
                    description: "The user you wish to impersonate.",
                    required: true
                },
                {
                    type: ApplicationCommandOptionType.STRING,
                    name: "message",
                    description: "The message you would like this user to say.",
                    required: true
                },
                {
                    type: ApplicationCommandOptionType.INTEGER,
                    name: "delay",
                    description: "Delay for the impersonated message to appear on your client (in seconds).",
                    required: false
                }
            ],
            execute: async (args, ctx) => {
                try {
                    setTimeout(() => {
                        sendBotMessage(ctx.channel.id, {
                            content: "```JSON\n" + `${JSON.stringify(args[0], null, 4)}` + "```",
                        });

                        FluxDispatcher.dispatch({
                            type: "MESSAGE_CREATE",
                            channelId: ctx.channel.id,
                            message: {
                                attachments: [],
                                author: {
                                    id: "1081004946872352958",
                                    username: "clyde",
                                    avatar: "a_6170487d32fdfe9f988720ad80e6ab8c",
                                    discriminator: "0000",
                                    public_flags: 0,
                                    premium_type: 2,
                                    flags: 0,
                                    bot: true,
                                    banner: null,
                                    accent_color: null,
                                    global_name: "Clyde",
                                    avatar_decoration_data: null,
                                    banner_color: null
                                },
                                channel_id: ctx.channel.id,
                                components: [],
                                content: args[1].value,
                                edited_timestamp: null,
                                embeds: [],
                                flags: 0,
                                id: (BigInt(Date.now() - 1420070400000) << 22n).toString(),
                                mention_everyone: false,
                                mention_roles: [],
                                mentions: [],
                                nonce: (BigInt(Date.now() - 1420070400000) << 22n).toString(),
                                pinned: false,
                                timestamp: new Date(),
                                tts: false,
                                type: 19
                            },
                            optimistic: false,
                            isPushNotification: false
                        });
                    }, (args[2]?.value ?? 0.5) * 1000);
                } catch (error) {
                    sendBotMessage(ctx.channel.id, {
                        content: `Something went wrong: \`${error}\``,
                    });
                }
            }
        }
    ]
});
