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
    name: "UserSettingsAPI",
    description: "Patches Discord's UserSettings to expose their group and name.",
    authors: [Devs.Nuckyz],

    patches: [
        {
            find: ",updateSetting:",
            replacement: [
                // Main setting definition
                {
                    match: /(?<=INFREQUENT_USER_ACTION.{0,20},)useSetting:/,
                    replace: "userSettingsAPIGroup:arguments[0],userSettingsAPIName:arguments[1],$&"
                },
                // Selective wrapper
                {
                    match: /updateSetting:.{0,100}SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE/,
                    replace: "userSettingsAPIGroup:arguments[0].userSettingsAPIGroup,userSettingsAPIName:arguments[0].userSettingsAPIName,$&"
                },
                // Override wrapper
                {
                    match: /updateSetting:.{0,60}USER_SETTINGS_OVERRIDE_CLEAR/,
                    replace: "userSettingsAPIGroup:arguments[0].userSettingsAPIGroup,userSettingsAPIName:arguments[0].userSettingsAPIName,$&"
                }

            ]
        }
    ]
});
