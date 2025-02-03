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

import managedStyle from "./style.css?managed";

export default definePlugin({
    name: "MemberListDecoratorsAPI",
    description: "API to add decorators to member list (both in servers and DMs)",
    authors: [Devs.TheSun, Devs.Ven],

    managedStyle,

    patches: [
        {
            find: ".lostPermission)",
            replacement: [
                {
                    match: /let\{[^}]*lostPermissionTooltipText:\i[^}]*\}=(\i),/,
                    replace: "$&vencordProps=$1,"
                }, {
                    match: /#{intl::GUILD_OWNER}(?=.+?decorators:(\i)\(\)).+?\1=?\(\)=>.+?children:\[/,
                    replace: "$&(typeof vencordProps=='undefined'?null:Vencord.Api.MemberListDecorators.__getDecorators(vencordProps)),"
                }
            ]
        },
        {
            find: "PrivateChannel.renderAvatar",
            replacement: {
                match: /decorators:(\i\.isSystemDM\(\))\?(.+?):null/,
                replace: "decorators:[Vencord.Api.MemberListDecorators.__getDecorators(arguments[0]),$1?$2:null]"
            }
        }
    ]
});
