/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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
    name: "SearchFix",
    description: "Fixes the annoying \"We dropped the magnifying glass!\" error. This fix isn't perfect, so you may have to reload the search bar to fix issues. Note: Discord only allows a max offset of 5000 (this is what causes the magnifying glass error). This means that you can only see precisely 125000 messages into the past, and 125000 messages into the future (when sorting by old). This plugin just jumps to the opposite sorting method to try get around Discord's restriction, but if there is a VERY large search result, and you try to view a message that is unobtainable with both methods of sorting, the plugin will simply show offset 0 (either newest or oldest message depending on the sorting method).",
    authors: [
        {
            id: 901016640253227059n,
            name: "Jaxx",
        },
    ],
    patches: [
        {
            find: "function(e,t,n){\"use strict\";let i;n.r(t),n.d(t,{default:function(){return O}}),n(\"843762\")",
            replacement: {
                match: /(.)\.offset=null!==\((.)=(.)\.offset\)&&void 0!==(.)\?(.):0/i,
                replace: (_, v, v1,query,v3,v4) => "" +
                    `${query}.offset > 5000 && ((${query}.sort_order === "asc" ? ${query}.sort_order = "desc" : ${query}.sort_order = "asc"), ${query}.sort_by = "timestamp", ${query}.offset = ${query}.offset > 5000 - 5000 ? 0 : ${query}.offset - 5000),\n` +
                    `${v}.offset = null !== (${v1} = ${query}.offset) && void 0 !== ${v3} ? ${v4} : 0`
                // "null !== (s = o.offset) && void 0 !== s ? s : 0"
            }
        }
    ],
});


// Explanation:

// Line 36 in a readable form:
// if offset is larger than 5000, toggle sort_order between ascending and descending,
// set sort_by to timestamp,
// and attempt to reach the page the user was searching for. If this doesn't work, set offset to 0.

// line 37 in a readable form:
// if the offset is neither null nor undefined, return the offset. Otherwise, set the offset to 0.
