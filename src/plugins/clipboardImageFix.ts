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


import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "ClipboardImageFix",
    description:
        "Fixes image pasting issues perdominantly caused by Firefox and assumptions made by Discord.",
    authors: [Devs.Cyn],
    required: true,
    patches: [
        {
            find: ".clipboardData.items[0].getAsString",
            replacement: {
                match: /2===(.)\.clipboardData\.items\.length\?.\.clipboardData\.items\[0\]\.getAsString\((.+?)\):(.+?);/,
                replace: (_, event, getAsStringCallback, normalCallback) =>
                    `if(2===${event}.clipboardData.items.length){const clipboardItems=${event}.clipboardData.items;for(let i = 0;i<clipboardItems.length;i++){const item = clipboardItems[i];if(item.type=="text/html"){item.getAsString(${getAsStringCallback});break;}}}else{${normalCallback}}`,
            },
        },
    ],
});
