/*
 * Vencord, a modification for Discord's desktop app
 // * Copyright (c) 2023 Vendicated and contributors
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
import { ApplicationCommandInputType, ApplicationCommandOptionType } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";

export default definePlugin({
    name: "Slap",
    description: "Adds a command from the land before Discord.",
    authors: [Devs.Korbo],
    commands: [{
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        name: "slap",
        description: "Slap someone/something.",
        options: [{
            name: "victim",
            description: "Thing to slap",
            required: true,
            type: ApplicationCommandOptionType.STRING,
        }],
        execute: async ([{value: victim}], ctx) => {
            return {content: `<@${UserStore.getCurrentUser().id}> slaps ${victim} around a bit with a large trout`};
        }
    }]
}, "Slap");
