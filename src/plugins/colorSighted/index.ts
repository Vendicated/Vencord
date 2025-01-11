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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ColorSighted",
    description: "Removes the colorblind-friendly icons from statuses, just like 2015-2017 Discord",
    authors: [Devs.lewisakura],
    patches: [
        {
            find: "Masks.STATUS_ONLINE",
            replacement: {
                match: /Masks\.STATUS_(?:IDLE|DND|STREAMING|OFFLINE)/g,
                replace: "Masks.STATUS_ONLINE"
            }
        },
        {
            find: ".AVATAR_STATUS_MOBILE_16;",
            replacement: {
                match: /(fromIsMobile:\i=!0,.+?)status:(\i)/,
                // Rename field to force it to always use "online"
                replace: '$1status_$:$2="online"'
            }
        }
    ]
});
