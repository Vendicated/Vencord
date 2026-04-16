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

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    hideArrow: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Hide Arrow",
        restartNeeded: true
    },
});

migratePluginSettings("AlwaysExpandRoles", "ShowAllRoles");
export default definePlugin({
    name: "AlwaysExpandRoles",
    description: "Always expands the role list in profile popouts",
    authors: [Devs.surgedevs],
    isModified: true,
    settings,
    patches: [
        {
            find: "hasDeveloperContextMenu:",
            replacement: [
                {
                    match: /(?<=\?\i\.current\[\i\].{0,100}?)useState\(!1\)/,
                    replace: "useState(!0)"
                },
                {
                    // Fix not calculating non-expanded roles because the above patch makes the default "expanded",
                    // which makes the collapse button never show up and calculation never occur
                    match: /(?<=useLayoutEffect\(\(\)=>\{if\()\i/,
                    replace: "false"
                },
                {
                    match: /\(\)=>\i\.length<\i\.length/,
                    replace: "()=>false",
                    predicate: () => settings.store.hideArrow
                }
            ]
        }
    ],
});
