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

import "./styles.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "TextEmoji",
    description: "Prevents Discord from replacing emoji with images, leaving it up to the browser to render them",
    authors: [Devs.Grzesiek11],
    patches: [
        // Reactions
        {
            find: 'throw Error("Unknown Src for Emoji")',
            replacement: {
                match: /(if\(null!=\i\))return \i\.\i\.getURL\(\i\)/,
                replace: "$1return null",
            },
        },
        // Messages
        {
            find: ",findInlineEmojisFromSurrogates:",
            replacement: {
                match: /if\(!0!==\i&&!\i\.test\(\i\)\)/,
                replace: "if(true)",
            },
        },
    ],
});
