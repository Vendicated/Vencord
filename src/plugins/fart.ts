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
import { Settings } from "@api/settings";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "Fart2",
    authors: [Devs.Animal],
    description: "Enable farting v2, a slash command that allows you to perform or request that someone perform a little toot.",
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "fart",
        description: "A simple command in which you may either request that a user do a little toot for you, or conduct one yourself.",
        options: [
            {
                type: ApplicationCommandOptionType.USER,
                name: "user",
                description: "A Discord™ user of which you would humbly request a toot from.",
                required: false
            }
        ],

        execute(args) {
            const fart = new Audio("https://raw.githubusercontent.com/ItzOnlyAnimal/AliuPlugins/main/fart.mp3");
            fart.volume = Settings.plugins.Fart2.volume;
            fart.play();

            return {
                content: (args[0]) ? `<@${args[0].value}> fart` : "fart"
            };
        },
    }],
    options: {
        volume: {
            description: "how loud you wanna fart (aka volume)",
            type: OptionType.SLIDER,
            markers: makeRange(0, 1, 0.1),
            default: 0.5,
            stickToMarkers: false,
        }
    }
});
