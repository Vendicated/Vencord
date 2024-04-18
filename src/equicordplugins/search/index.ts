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

import { ApplicationCommandOptionType, findOption } from "@api/Commands";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "Search",
    authors: [Devs.JacobTm, EquicordDevs.thororen],
    description: "Searchs the web.",
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "search",
        description: "Generates search link.",
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: "Search query",
                description: "What do you want to search?",
                required: true
            },
            {
                type: ApplicationCommandOptionType.STRING,
                name: "Search engine",
                description: "What do you want to search?",
                required: true,
                choices: [
                    { label: "Google", name: "Google", value: "google" },
                    { label: "Bing", name: "Bing", value: "bing" },
                    { label: "DuckDuckGo", name: "DuckDuckGo", value: "duckduckgo" },
                    { label: "Brave", name: "Brave", value: "brave" },
                    { label: "Yahoo", name: "Yahoo", value: "yahoo" },
                    { label: "Yandex", name: "Yandex", value: "yandex" },
                ]
            }
        ],

        execute(args) {
            const rfc3986EncodeURIComponent = str => encodeURIComponent(str).replace(/[!'()*]/g, escape);
            const query = findOption<string>(args, "Search query");
            const engine = findOption<string>(args, "Search engine");
            let link;
            switch (engine) {
                case "google":
                    link = `https://google.com/search?query=${rfc3986EncodeURIComponent(query)}`;
                    break;
                case "bing":
                    link = `https://bing.com/search?q=${rfc3986EncodeURIComponent(query)}`;
                    break;
                case "duckduckgo":
                    link = `https://duckduckgo.com/${rfc3986EncodeURIComponent(query)}`;
                    break;
                case "brave":
                    link = `https://search.brave.com/search?q=${rfc3986EncodeURIComponent(query)}`;
                    break;
                case "yahoo":
                    link = `https://search.yahoo.com/search?p=${rfc3986EncodeURIComponent(query)}`;
                    break;
                case "yandex":
                    link = `https://yandex.com/search?text=${rfc3986EncodeURIComponent(query)}`;
                    break;
            }
            return {
                content: link
            };
        }
    }],
});
