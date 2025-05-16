/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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
    name: "NSFWGateBypass",
    description: "Allows you to access NSFW channels without setting/verifying your age",
    authors: [Devs.Commandtechno],
    patches: [
        {
            find: ".nsfwAllowed=null",
            replacement: [
                {
                    match: /(?<=\.nsfwAllowed=)null!=.+?(?=[,;])/,
                    replace: "true",
                },
                {
                    match: /(?<=\.ageVerificationStatus=)null!=.+?(?=[,;])/,
                    replace: "3", // VERIFIED_ADULT
                }
            ],
        }
    ],
});
