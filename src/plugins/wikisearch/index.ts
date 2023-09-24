/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "Wikisearch",
    description: "Searches Wikipedia for your requested query. (/wikisearch)",
    authors: [Devs.Samu],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "wikisearch",
            description: "Searches Wikipedia for your request.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "search",
                    description: "Word to search for",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
            ],
            execute: async (_, ctx) => {
                const word = findOption(_, "search", "");

                if (!word) {
                    return sendBotMessage(ctx.channel.id, {
                        content: "No word was defined!"
                    });
                }

                const dataSearchParams = new URLSearchParams({
                    action: "query",
                    format: "json",
                    list: "search",
                    formatversion: "2",
                    origin: "*",
                    srsearch: word
                });

                const data = await fetch("https://en.wikipedia.org/w/api.php?" + dataSearchParams).then(response => response.json())
                    .catch(err => {
                        console.log(err);
                        sendBotMessage(ctx.channel.id, { content: "There was an error. Check the console for more info" });
                        return null;
                    });

                if (!data) return;

                if (!data.query?.search?.length) {
                    console.log(data);
                    return sendBotMessage(ctx.channel.id, { content: "No results given" });
                }

                const altData = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=info%7Cdescription%7Cimages%7Cimageinfo%7Cpageimages&list=&meta=&indexpageids=1&pageids=${data.query.search[0].pageid}&formatversion=2&origin=*`)
                    .then(res => res.json())
                    .then(data => data.query.pages[0])
                    .catch(err => {
                        console.log(err);
                        sendBotMessage(ctx.channel.id, { content: "There was an error. Check the console for more info" });
                        return null;
                    });

                if (!altData) return;

                const thumbnailData = altData.thumbnail;

                const thumbnail = thumbnailData && {
                    url: thumbnailData.source.replace(/(50px-)/ig, "1000px-"),
                    height: thumbnailData.height * 100,
                    width: thumbnailData.width * 100
                };

                sendBotMessage(ctx.channel.id, {
                    embeds: [
                        {
                            type: "rich",
                            title: data.query.search[0].title,
                            url: `https://wikipedia.org/w/index.php?curid=${data.query.search[0].pageid}`,
                            color: "0x8663BE",
                            description: data.query.search[0].snippet.replace(/(&nbsp;|<([^>]+)>)/ig, "").replace(/(&quot;)/ig, "\"") + "...",
                            image: thumbnail,
                            footer: {
                                text: "Powered by the Wikimedia API",
                            },
                        }
                    ] as any
                });
            }
        }
    ]
});
