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

import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    ignoreSilent: {
        description: 'Ignore "silent" messages',
        type: OptionType.BOOLEAN,
        default: false
    }
});
export default definePlugin({
    name: "Cutecord",
    description: "Cuter notification settings",
    authors: [Devs.katlyn],
    patches: [{
        find: ".RECIPIENT_REMOVE)",
        replacement: {
            match: /null!=\i.flags.{0,30}SUPPRESS_NOTIFICATIONS\)/,
            replace: "$& && !$self.settings.ignoreSilent"
        }
    }],
    settings
});
