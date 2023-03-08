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
                const word = findOption(_, "search");

                if (!word) {
                    return sendBotMessage(ctx.channel.id, {
                        content: "No word was defined!"
                    });
                }

                fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&formatversion=2&origin=*&srsearch=${word}`)
                    .then(response => response.json())
                    .then(async data => {
                        if (!data.query) return sendBotMessage(ctx.channel.id, { content: "No reply was given from Wikipedia. Check console for errors" });

                        if (!data.query.search[0]) return sendBotMessage(ctx.channel.id, { content: "No results :(" });

                        const firstres = data.query.search[0];

                        let alt_data;
                        let thumbnail;

                        await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=info%7Cdescription%7Cimages%7Cimageinfo%7Cpageimages&list=&meta=&indexpageids=1&pageids=${firstres.pageid}&formatversion=2&origin=*`)
                            .then(data => data.json())
                            .then(data => alt_data = data.query.pages[0] || null);

                        const thumbnail_data = alt_data.thumbnail;

                        if (!thumbnail_data) thumbnail = null;
                        else thumbnail = {
                            url: thumbnail_data.source.replace(/(50px-)/ig, "1000px-"),
                            height: thumbnail_data.height * 100,
                            width: thumbnail_data.width * 100
                        };

                        sendBotMessage(ctx.channel.id, {
                            embeds: [
                                {
                                    type: "rich",
                                    title: data.query.search[0].title,
                                    url: `https://wikipedia.org/w/index.php?curid=${firstres.pageid}`,
                                    color: "0x8663BE",
                                    description: firstres.snippet.replace(/(&nbsp;|<([^>]+)>)/ig, "").replace(/(&quot;)/ig, "\"") + "...",
                                    image: thumbnail,
                                    footer: {
                                        text: "Powered by the Wikimedia API",
                                    },
                                }
                            ] as any
                        });
                    });
            }
        }
    ]
});
