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

import definePlugin from "@utils/types";

function createCancelAction(prepend: string, serverIdRead: string, append: string, returnValue?: string) {
    return `${prepend} try { if (window.unownedGuilds != null && window.unownedGuilds[${serverIdRead}] == true) { return${(" " + returnValue) ?? ""}; } } catch {} ${append}`;
}

export default definePlugin({
    name: "Permission Viewer",
    description: "Enables server/channel settings view by tricking the client into thinking you have permission to",
    authors: [
        {
            id: 477974820504731648n,
            name: "peyton"
        },
        {
            id: 87386662375546880n,
            name: "vsk"
        }
    ],

    patches: [
        {
            find: "canAccessGuildSettings=function",
            replacement: [
                {
                    match: /(;[A-z]+?)\.canAccessGuildSettings=function\(.+?\){.*?return.+?};/,
                    replace: "$1.canAccessGuildSettings=()=>true;"
                },
                {
                    match: /;([A-z])+\.can=function\((.+?),(.+?),(.+?)\)({var.+?[A-z]+?\(.+?,\1,.+?\);return .+?\(.*?\)});/g,
                    replace: ";$1.can=function($2, $3, $4) { const hasPerm = (() => $5)(); if($2 == 0x0000000010000000 && $3 != null) { window.unownedGuilds = window.unownedGuilds || {}; if (!hasPerm && window.unownedGuilds[$3.id] == null) { window.unownedGuilds[$3.id] = true; } else if (hasPerm) { window.unownedGuilds[$3.id] = null; } return true; } return hasPerm; };"
                }
            ]
        },
        {
            find: "include_role_connections_metadata",
            replacement: [
                {
                    match: /(function [A-z]+?\(([A-z]+?)\)\{)(.+?get.+?GUILD_INTEGRATIONS.+?\})/,
                    replace: createCancelAction("$1", "$2", "$3")
                },
                {
                    match: /(\}function [A-z]+?\(([A-z]+?)\){)(.+\n?.+?GUILD_INTEGRATIONS.+?has_commands)/,
                    replace: createCancelAction("$1", "$2", "$3")
                }
            ]
        },
        {
            find: ".permissions.toString()",
            replacement: [
                {
                    match: /(\),\[\w+?,(\w+?)\.id,null==.+?:(\w+)\.id]\);\w+?\.useEffect\(\(function\(\)\{)(null.+?==\3\?void 0:)/,
                    replace: createCancelAction("$1", "$2.id", "$4")
                },
                {
                    match: /(onSave:function\(\){if\(null!=(\w+)\){)(var \w+=\2\.id)/,
                    replace: createCancelAction("$1", "$2.id", "$3")
                }
            ]
        },
        {
            find: "updateMemberRoles:function(",
            replacement: [
                {
                    match: /(updateMemberRoles:function\((\w+),.+?\){)(return)/,
                    replace: createCancelAction("$1", "$2", "$3")
                }
            ]
        },
        {
            find: "updatePermissionOverwrite:function(",
            replacement: [
                {
                    match: /(updatePermissionOverwrite:function\(\w+,(\w+)\){)(return)/,
                    replace: createCancelAction("$1", "$2.id", "$3", "Promise.resolve()")
                }
            ]
        }
    ]
});
