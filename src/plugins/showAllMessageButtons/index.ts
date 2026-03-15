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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { canonicalizeMatch } from "@utils/patches";
import definePlugin, { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    showFrequentlyUsedReactions: {
        description: "Show frequently used reactions",
        type: OptionType.BOOLEAN,
        default: true
    }
})

export default definePlugin({
    name: "ShowAllMessageButtons",
    description: "Always show all message buttons no matter if you are holding the shift key or not.",
    authors: [Devs.Nuckyz, Devs.LoganDark],

    settings,

    patches: [
        {
            find: "#{intl::MESSAGE_UTILITIES_A11Y_LABEL}",
            replacement: [
                {
                    // isExpanded: isShiftPressed && other conditions...
                    match: /isExpanded:\i&&(.+?),/,
                    replace: "isExpanded:$1,"
                },
                {
                    match: /function \i\(\i\){let{(?:\i:\i,)*canReact:(\i)(?:,\i:\i)*}=function\(\i\).*?}(?=function \i\(\i\))/,
                    replace: (func, canReactVar) => {
                        const reactionsElement = canonicalizeMatch(/(?<=\?null:)\(0,[^)]+\)\(\i\.Fragment,{children:\[[^\]]+\]}\)/).exec(func)![0];
                        return func.replace(/children:\[/, children => `${children}!${canReactVar}||!$self.settings.store.showFrequentlyUsedReactions?null:${reactionsElement},`);
                    }
                }
            ]
        }
    ]
});
