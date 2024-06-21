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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "UserSettingDefinitionsAPI",
    description: "Patches Discord's UserSettingDefinitions to expose their group and name.",
    authors: [Devs.Nuckyz],

    patches: [
        {
            find: ",updateSetting:",
            replacement: [
                // Main setting definition
                {
                    match: /(?<=INFREQUENT_USER_ACTION.{0,20},)useSetting:/,
                    replace: "userSettingDefinitionsAPIGroup:arguments[0],userSettingDefinitionsAPIName:arguments[1],$&"
                },
                // Selective wrapper
                {
                    match: /updateSetting:.{0,100}SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE/,
                    replace: "userSettingDefinitionsAPIGroup:arguments[0].userSettingDefinitionsAPIGroup,userSettingDefinitionsAPIName:arguments[0].userSettingDefinitionsAPIName,$&"
                },
                // Override wrapper
                {
                    match: /updateSetting:.{0,60}USER_SETTINGS_OVERRIDE_CLEAR/,
                    replace: "userSettingDefinitionsAPIGroup:arguments[0].userSettingDefinitionsAPIGroup,userSettingDefinitionsAPIName:arguments[0].userSettingDefinitionsAPIName,$&"
                }

            ]
        }
    ]
});
