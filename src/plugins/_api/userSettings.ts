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
    description: "Patches Discord's UserSettings to expose their group and name",
    authors: [Devs.Nuckyz],

    patches: [
        {
            find: ",updateSetting:",
            replacement: [
                {
                    match: /(?<=INFREQUENT_USER_ACTION.{0,20}),useSetting:/,
                    replace: ",userSettingsApiGroup:arguments[0],userSettingsApiName:arguments[1]$&"
                },
                // some wrapper. just make it copy the group and name
                {
                    match: /updateSetting:.{0,20}shouldSync/,
                    replace: "userSettingsApiGroup:arguments[0].userSettingsApiGroup,userSettingsApiName:arguments[0].userSettingsApiName,$&"
                }
            ]
        }
    ]
});
