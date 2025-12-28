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
    reactionCount: {
        description: "Number of reactions (0-42)",
        type: OptionType.NUMBER,
        default: 5
    },
});

export default definePlugin({
    name: "MoreQuickReactions",
    description: "Increases the number of reactions available in the Quick React hover menu",
    authors: [Devs.iamme],
    settings,

    get reactionCount() {
        return settings.store.reactionCount;
    },

    patches: [
        {
            find: "#{intl::MESSAGE_UTILITIES_A11Y_LABEL}",
            replacement: {
                match: /(?<=length>=3\?.{0,40}\.slice\(0),3\)/,
                replace: ",$self.reactionCount)"
            }
        }
    ],
});
