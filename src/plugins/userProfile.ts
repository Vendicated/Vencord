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

import { ApplicationCommandInputType, ApplicationCommandOptionType, Argument } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "UserProfile",
    description: "Allows you to open a Users Profile using a slash command",
    authors: [Devs.duckulus, Devs.homeknopf],
    patches: [],
    commands: [
        {
            name: "user",
            description: "open a users profile",
            options: [{
                name: "ID",
                description: "The User's ID",
                type: ApplicationCommandOptionType.STRING,
                required: true
            }],
            execute(args: Argument[]) {
                Vencord.Util.openUserProfile(args[0].value);
            },
            inputType: ApplicationCommandInputType.BUILT_IN
        }
    ]
});
