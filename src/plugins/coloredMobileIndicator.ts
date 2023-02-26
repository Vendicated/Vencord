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
    name: "ColoredMobileIndicator",
    description: "Makes the mobile indicator match the color of the user status.",
    authors: [Devs.Nuckyz],
    patches: [
        {
            // Return the STATUS_ONLINE_MOBILE mask if the user is on mobile, no matter the status
            find: ".Masks.STATUS_ONLINE_MOBILE",
            replacement: [
                {
                    match: /(?<=return \i\.\i\.Masks\.STATUS_TYPING;)(.+?)(\i)\?(\i\.\i\.Masks\.STATUS_ONLINE_MOBILE):/,
                    replace: (_, rest, isMobile, mobileMask) => `if(${isMobile})return ${mobileMask};${rest}`
                }
            ]
        },
        {
            find: ".AVATAR_STATUS_MOBILE_16;",
            replacement: [
                {
                    // Return the AVATAR_STATUS_MOBILE size mask if the user is on mobile, no matter the status
                    match: /\i===\i\.\i\.ONLINE&&(?=.{0,70}\.AVATAR_STATUS_MOBILE_16;)/,
                    replace: ""
                },
                {
                    // Fix sizes for mobile indicators which aren't online
                    match: /(?<=\(\i\.status,)(\i)(?=,(\i),\i\))/,
                    replace: (_, userStatus, isMobile) => `${isMobile}?"online":${userStatus}`
                }
            ]
        },
        {
            // Make isMobileOnline return true no matter what is the user status
            find: "isMobileOnline=function",
            replacement: [
                {
                    match: /(?<=\i\[\i\.\i\.MOBILE\])===\i\.\i\.ONLINE/,
                    replace: "!= null"
                }
            ]
        }
    ]
});
