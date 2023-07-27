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

import { ApplicationCommandOptionType } from "../api/Commands";
import definePlugin from "../utils/types";
import { Devs } from "@utils/constants";

async function shortenUrl(url) {
    try {
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${url}`);
        if (res.ok) {
            const shortenedUrl = await res.text();
            return shortenedUrl;
        } else {
            throw new Error("Failed to shorten the URL");
        }
    } catch (err) {
        console.error(err);
        return null;
    }
}

export default definePlugin({
    name: "UrlShortener",
    authors: [Devs.trappist],
    description: "Add a command to shorten URLs and send them in the chat",
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "shorten",
        description: "Create shorter URLs",
        options: [
            {
                name: "url",
                description: "Paste the link you wish to shorten here (If you type anything other than a link, it will send as a normal message)",
                type: ApplicationCommandOptionType.STRING,
                required: true,
            },
        ],

        async execute(args) {
            const inputText = args[0].value as string;
            const shortenedUrl = await shortenUrl(inputText);

            return {
                content: shortenedUrl || inputText,
            };
        },
    }],
});
