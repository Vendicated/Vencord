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

export default definePlugin({
    name: "Permission Viewer",
    description: "Enables server settings view by tricking the client into thinking you are the owner of every guild",
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
                    match: /;([A-z]+?)\.canAccessGuildSettings=function\(.+?\){.*?return.+?};/,
                    replace: ";$1.canAccessGuildSettings=function(){return true;};"
                },
                {
                    match: /;([A-z])+\.can=function\((.+?),(.+?)\)({var.+?[A-z]+?\(.+?,\1,.+?\);return .+?\(.*?\)});/g,
                    replace: ";$1.can=function($2, $3) { if($2 == 0x0000000010000000) { return true; } else $4 };"
                }
            ]
        }
    ]
});
