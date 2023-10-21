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

import {
    ApplicationCommandInputType,
    ApplicationCommandOptionType,
} from '@api/Commands';
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from '@utils/types';
import { definePluginSettings } from '@api/Settings'

const enum Provider {
    LMGT = "letmegooglethat.com",
    GTFY = "googlethatforyou.com"
}
const settings = definePluginSettings({
    Provider: {
        type: OptionType.SELECT,
        description: "Which website to use? Useful for when the default site is down",
        options: [
            {
                label: "letmegooglethat.com",
                value: Provider.LMGT,
                default: true
            },
            {
                label: "googlethatforyou.com (Feeling Lucky not supported)",
                value: Provider.GTFY
            }
        ]
        
    },})
export default definePlugin({
    name: 'LMGTFY',
    description:
        "Generates a 'letmegooglethat' link and copies it to the clipboard",
    authors: [Devs.Jaxx],
    settings,
    commands: [
        {
            name: 'LMGTFY',
            description:
                'For people that bother you with questions instead of looking it up themselves',
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: 'search',
                    description: 'What to search up',
                    type: ApplicationCommandOptionType.STRING,
                    required: true,
                },
                {
                    name: 'feeling lucky',
                    description: 'Whether or not to select the first result',
                    type: ApplicationCommandOptionType.BOOLEAN,
                    required: true,
                },
            ],
            execute: async (args, ctx) => {
                DiscordNative.clipboard.copy(`https://${settings.store.Provider}/?q=${encodeURIComponent(args[0].value)}${args[1].value && settings.store.Provider !== Provider.GTFY ? '&l=1':''}`);
            },
        },
    ],
    start() {},
    stop() {},
});
