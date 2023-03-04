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

import { ApplicationCommandOptionType } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "LetMeGoogleThat",
    authors: [Devs.JacobTm],
    description: "Creates LetMeGoogleThat link.",
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "lmgth",
        description: "Generates lmgth link.",
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: "Search query",
                description: "What do you want to search?",
                required: true
            }
        ],

        execute(args) {
            const query = args[0].value.replace(" ", "+");
            let link = "https://letmegooglethat.com/?q=" + query;
            return {
                content: link
            };
        }
    }],
});
