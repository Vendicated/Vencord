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

import { enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { TimezoneTriggerInline, UserContextMenuPatch } from "./components";
import { settings } from "./settings";
import timeZoneStyle from "./style.css?managed";

enableStyle(timeZoneStyle);

export default definePlugin({
    name: "TimezoneOnProfile",
    description: "Add user-specific timezones to profiles and messages.",
    authors: [Devs.haz, Devs.Yuuki],
    settings,
    contextMenus: {
        "user-context": UserContextMenuPatch,
        "user-profile-actions": UserContextMenuPatch,
        "user-profile-overflow-menu": UserContextMenuPatch
    },
    TimezoneTriggerInline,
    patches: [
        {
            find: "userTagUsername,",
            replacement: {
                match: /(!(\i)\.isProvisional&&)(\i\(\(0,(\i)\.jsx\)\(\i\.\i,\{)/,
                replace: "$1(0,$4.jsx)($self.TimezoneTriggerInline,{userId:$2.id, ...arguments[0]}),$3"
            }
        }
    ],
});
