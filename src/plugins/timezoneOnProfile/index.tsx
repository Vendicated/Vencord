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

import {TimezoneTriggerProfile, TimezoneTriggerUsername, UserContextMenuPatch} from "./components";
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
    TimezoneTriggerProfile,
    TimezoneTriggerUsername,
    patches: [
        {
            find: '="SYSTEM_TAG"',
            replacement: {
                match: /(\(0,(\i)\.jsxs\)\(\2\.Fragment,\{children:\[(?:(?!\]\}\)).){0,900}?),(\i)(?=\]\}\))/g,
                replace: '$1,$3,(0,$2.jsx)(Vencord.Plugins.plugins["TimezoneOnProfile"].TimezoneTriggerUsername,{userId:arguments[0].message.author.id})'
            }
        },
        {
            find: "forceUsername:!0,className",
            replacement: {
                match: /(\i=(\i)\.isProvisional\?null:)(\(0,(\i)\.jsx\)\(\i\.\i,\{user:\2.{0,250}?forceUsername:!0.{0,250}?usernameClass:((\i)\.\i).{0,250}?hideBotTag:!0\}\))/,
                replace: "$1(0,$4.jsxs)($4.Fragment,{children:[(0,$4.jsx)($self.TimezoneTriggerProfile,{userId:$2.id,className:$5}),$3]})"
            }
        }
    ],
});

/*
Patches remaining:
Compact mode usernames
main modal profile
miniprofile
 */
