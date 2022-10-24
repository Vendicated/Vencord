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

import definePlugin, { OptionType } from "../utils/types";
import { Settings } from "../Vencord";

export default definePlugin({
    name: "RemoveNitroAds",
    description: "Removes nitro ads from discord.",
    authors: [{
        id: 477751710979457035n,
        name: "ayes-web"
    }],
    patches: [
        {
            find: "function Vp(e){",
            predicate: () => Settings.plugins.RemoveNitroAds.removeGiftButton === true,
            replacement: [{
                match: /(return r\.createElement\(Mp,Hp\({},e,{)/,
                replace: "return null;$1",
            }]
        }, {
            find: "NJ=function(e){",
            predicate: () => Settings.plugins.RemoveNitroAds.removeChatListNitroButton === true,
            replacement: [{
                match: /(NJ=function\(e\){)/,
                replace: "$1return null;",
            }]
        }
    ],
    options: {
        removeGiftButton: {
            description: "Removes gift button from message bar.",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        },
        removeChatListNitroButton: {
            description: "Removes chat list's nitro button.",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        }
    }
});
