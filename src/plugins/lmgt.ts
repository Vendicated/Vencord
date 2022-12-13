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
import definePlugin from "@utils/types";

async function google(url): Promise<string> {
    return "<https://googlethatforyou.com?q=" + url + ">";
}

export default definePlugin({
    name: "LMGT",
    description: "Let me google that for you. https://www.youtube.com/watch?v=vxCohrWshvM",
    authors: [
        {
            id: 705798778472366131n,
            name: "Sambot",
        },
    ],
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "lmgt",
        description: "For those who don't want to google it themselves.",
        options: [
            {
                name: "query",
                description: "What query you want to google.",
                type: ApplicationCommandOptionType.STRING,
            },
        ],
        execute: async opts => ({
            content: await google(findOption(opts, "query", "")),
        })
    }]

});
