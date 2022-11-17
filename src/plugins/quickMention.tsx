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

import definePlugin from "../utils/types";



let stolenType: any;
let stolenProps: any;
let stolenChildren: any;

export default definePlugin({
    name: "QuickMention",

    authors: [{
        name: "kemo",
        id: 299693897859465228n
    }],

    description: "Quick mention",

    patches: [
        // Vencord.Plugins.plugins.QuickMention
        {
            find: "id:\"reply\",label:_.Z.Messages.MESSAGE_ACTION_REPLY,",
            replacement: {
                match: /(""\.concat\(.{1}\.channel_id,"-"\)\.concat\(.{1}\.id\)\).{38})(.{115})/,
                replace: "$1[$2,$2]"
            }
        }
    ],

    Hook(element: any) {
        console.log("NIGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGER");
        console.log(element);
    },
});
