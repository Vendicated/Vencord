/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and Megumin
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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    disableAdoptTagPrompt: {
        type: OptionType.BOOLEAN,
        description: "Disable the prompt to adopt tags",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "GuildTagSettings",
    description: "Adds some settings for guild tags, such as hiding them or disabling the prompt to adopt them.",
    authors: [Devs.thororen],
    settings,
    patches: [
        {
            find: "GuildTagAvailableCoachmark",
            replacement: {
                match: /return.{0,100}shouldShow/g,
                replace: "return null;$&"
            },
            predicate: () => settings.store.disableAdoptTagPrompt
        }
    ]
});
