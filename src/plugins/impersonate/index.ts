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
import { FluxDispatcher } from "@webpack/common";
import { UserStore } from "@webpack/common";
import definePlugin from "@utils/types";

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
                    type: ApplicationCommandOptionType.CHANNEL,
                    name: "channel",
                    description: "Channel the impersonated message should be sent in.",
                    required: false
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
                    let channel = args.filter(x => x.name == "channel") ?? { value: ctx.channel.id };
                    let delay = args.filter(x => x.name == "delay");
                    let user = UserStore.getUser(args[0].value);

                    sendBotMessage(ctx.channel.id, {
                        content: "```JSON\n" + JSON.stringify(channel, undefined, 4) + "```",
                    });
                    
                    if (delay) {
                        FluxDispatcher.dispatch({
                            type: "TYPING_START",
                            channelId: channel.value,
                            userId: user.id,
                        });
                    }

                    setTimeout(() => {
                        FluxDispatcher.dispatch({
                            type: "MESSAGE_CREATE",
                            channelId: channel.value,
                            message: {
                                attachments: [],
                                author: {
                                    id: user.id,
                                    username: user.username,
                                    avatar: user.avatar,
                                    discriminator: user.discriminator,
                                    public_flags: user.publicFlags,
                                    premium_type: user.premiumType,
                                    flags: user.flags,
                                    banner: user.banner,
                                    accent_color: null,
                                    global_name: user.globalName,
                                    avatar_decoration_data: (user.avatarDecorationData) ? { asset: user.avatarDecorationData.asset, sku_id: user.avatarDecorationData.skuId } : null,
                                    banner_color: null
                                },
                                channel_id: channel.value,
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
                    }, (Number(delay?.value ?? 0.5) * 1000));
                } catch (error) {
                    sendBotMessage(ctx.channel.id, {
                        content: `Something went wrong: \`${error}\``,
                    });
                }
            }
        }
    ]
});