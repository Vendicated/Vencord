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
	name: "NoProfileThemes",
	description: "Completely removes Nitro profile themes",
	authors: [Devs.TheKodeToad],
	patches: [
		{
			find: ".NITRO_BANNER,",
			replacement: {
				match: /\i\.\i\.isPremiumAtLeast\(null==(\i)/,
				replace: "$1?.banner&&$&"
			}
		},
		{
			find: "().avatarPositionPremiumNoBanner,default:",
			replacement: {
				match: /avatarPositionPremiumNoBanner,default:(\i\(\)\.(\i))/,
				replace: "$2,default:$1"
			}
		},
		{
			find: ".hasThemeColors=function(){",
			replacement: {
				match: /key:"canUsePremiumProfileCustomization",get:function\(\){return/,
				replace: "$& false&&"
			}
		}
	]
});
