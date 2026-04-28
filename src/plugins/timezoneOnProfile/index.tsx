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

import { TimezoneTriggerProfile, TimezoneTriggerUsername, UserContextMenuPatch } from "./components";
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
                replace: "$1,$3,(0,$2.jsx)($self.TimezoneTriggerUsername,{userId:arguments[0].message.author.id,timestamp:arguments[0].message.timestamp,isDM:arguments[0].channel?.isPrivate?.()})"
            } // TODO: fix up this patch maybe because it's lowkey disgusting
        },
        {
            find: "forceUsername:!0,className",
            replacement: {
                match: /(children:\[)(null!=\i&&null!=\i\?\(0,(\i)\.jsx\)\(\i\.D,\{.{0,160}?children:\i\}\):\i)/,
                replace: "$1(0,$3.jsx)($self.TimezoneTriggerProfile,{userId:arguments[0].user.id}),$2"
            }
        }
    ],
});
