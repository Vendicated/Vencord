/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "RobloxUserSearch",
    description: "Pulls up info on a Roblox user",
    authors: [Devs.bigbenster702],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "robloxusersearch",
            description: "Searches for a Roblox user by their username and returns info on them",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "username",
                    description: "The username of the Roblox user you want to search for",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
            ],
            execute: async (args, ctx) => {
                try {
                    const grabUserId = await fetch("https://users.roproxy.com/v1/usernames/users", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ usernames: [args[0].value] }),
                    }).then(response => response.json());

                    if (grabUserId.errors && grabUserId.errors[0].code === 4)
                        return void sendBotMessage(ctx.channel.id, { content: "You are being rate limited. Please try again later." });

                    if (grabUserId.data.length === 0)
                        return void sendBotMessage(ctx.channel.id, { content: "No results found." });

                    const userId = grabUserId.data[0].id;
                    const userInfo = await fetch(`https://users.roproxy.com/v1/users/${userId}`).then(response => response.json());

                    if (grabUserId.errors && userInfo.errors[0].code === 4)
                        return void sendBotMessage(ctx.channel.id, { content: "You are being rate limited. Please try again later." });

                    const userImage = await fetch(`https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`).then(response => response.json());
                    const age = Math.round(Math.abs((new Date(userInfo.created).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)));

                    return void sendBotMessage(ctx.channel.id, {
                        embeds: [
                            {
                                type: "rich",
                                title: `Roblox User Info - ${userInfo.name}`,
                                url: `https://www.roblox.com/users/${userId}/profile`,
                                thumbnail: {
                                    url: `${userImage.data[0].imageUrl}.png`,
                                    height: 420,
                                    width: 420,
                                },
                                fields: [
                                    {
                                        name: "Username",
                                        value: userInfo.name,
                                        inline: true
                                    },
                                    {
                                        name: "Display Name",
                                        value: userInfo.displayName,
                                        inline: true
                                    },
                                    {
                                        name: "User Id",
                                        value: String(userId),
                                        inline: true
                                    },
                                    {
                                        name: "Created On",
                                        value: `<t:${Math.floor(+new Date(userInfo.created) / 1000)}:f> (${age} days)`,
                                        inline: true
                                    },
                                    {
                                        name: "Banned",
                                        value: userInfo.isBanned ? "Yes" : "No",
                                        inline: true
                                    },
                                    {
                                        name: "Verified",
                                        value: userInfo.hasVerifiedBadge ? "Yes" : "No",
                                        inline: true
                                    },
                                    {
                                        name: "Description",
                                        value: userInfo.description,
                                    }
                                ],
                                color: 0xE2231A,
                                footer: { text: "Roblox API", icon_url: "https://www.roblox.com/favicon.ico" },
                                timestamp: new Date().toISOString(),
                            },
                        ] as any,
                    });
                } catch (error) {
                    sendBotMessage(ctx.channel.id, {
                        content: `Something went wrong, there is a chance roblox could be down: \`${error}\``,
                    });
                }
            }
        }
    ]
});
