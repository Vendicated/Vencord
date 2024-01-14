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

import { ApplicationCommandOptionType } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const searchEngineChoices = [
    { name: "Google", value: "google.com", label: "Google" },
    { name: "Bing", value: "bing.com", label: "Bing" },
    { name: "DuckDuckGo", value: "duckduckgo.com", label: "DuckDuckGo" },
    { name: "searX", value: "searx.thegpm.org", label: "searX (instance searx.thegpm.org)" },
    { name: "StartPage", value: "startpage.com", label: "StartPage" },
    { name: "Yandex", value: "yandex.com", label: "Yandex" },
    { name: "Custom", value: "custom", label: "Custom" }
];

export const settings = definePluginSettings({
    // defaultSearchEngine: {
    //     type: OptionType.SELECT,
    //     description: "Select your default search engine.",
    //     default: "google.com",
    //     options: searchEngineChoices
    // },
    customSearchEngine: {
        type: OptionType.STRING,
        description: "Enter the URL of your custom search engine. (make sure it supports the q= query parameter)",
        default: "example.com",
        restartNeeded: false
    }
});


export default definePlugin({
    name: "Search",
    authors: [Devs.JacobTm],
    settings,
    description: "Generates search links for various search engines.",
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "search",
        description: "Generates search link for selected engine.",
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: "Search engine",
                description: "Which search engine do you want to use?",
                required: true,
                choices: searchEngineChoices,
            },
            {
                type: ApplicationCommandOptionType.STRING,
                name: "Search query",
                description: "What do you want to search?",
                required: true
            },
        ],
        execute(args) {
            console.log(args);
            const query = args[1].value.replace(" ", "+");
            // todo
            // if (args.length === 1) {
            //     return {
            //         content: `https://${settings.store.defaultSearchEngine}/?q=${query}`
            //     };
            // }
            if (args[0].value === "google.com") {
                return {
                    content: `https://google.com/search?q=${query}`
                };
            } else if (args[0].value === "custom") {
                return {
                    content: `https://${settings.store.customSearchEngine}/?q=${query}`
                };
            } else {
                return {
                    content: `https://${args[0].value}/?q=${query}`
                };
            }
        }
    }],
});
