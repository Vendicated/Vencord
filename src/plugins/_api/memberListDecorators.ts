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
    name: "MemberListDecoratorsAPI",
    description: "API to add decorators to member list (both in servers and DMs)",
    authors: [Devs.TheSun, Devs.Ven],
    patches: [
        {
            find: "lostPermissionTooltipText,",
            replacement: {
                match: /decorators:.{0,100}?children:\[(?<=(\i)\.lostPermissionTooltipText.+?)/,
                replace: "$&...Vencord.Api.MemberListDecorators.__getDecorators($1),"
            }
        },
        {
            find: "PrivateChannel.renderAvatar",
            replacement: [
                // props are shadowed by nested props so we have to do this
                {
                    match: /\i=(\i)\.applicationStream,/,
                    replace: "$&vencordProps=$1,"
                },
                {
                    match: /decorators:(\i\.isSystemDM\(\))\?(.+?):null/,
                    replace: "decorators:[...(typeof vencordProps=='undefined'?[]:Vencord.Api.MemberListDecorators.__getDecorators(vencordProps)), $1?$2:null]"
                }
            ]
        }
    ],
});
