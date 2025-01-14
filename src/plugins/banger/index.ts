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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    source: {
        description: "Source to replace ban GIF with (Video or Gif)",
        type: OptionType.STRING,
        default: "https://i.imgur.com/wp5q52C.mp4",
        restartNeeded: true,
    }
});

export default definePlugin({
    name: "BANger",
    description: "Replaces the GIF in the ban dialogue with a custom one.",
    authors: [Devs.Xinto, Devs.Glitch],
    settings,
    patches: [
        {
            find: "#{intl::BAN_CONFIRM_TITLE}",
            replacement: {
                match: /src:\i\("?\d+"?\)/g,
                replace: "src:$self.source"
            }
        }
    ],
    get source() {
        return settings.store.source;
    }
});
