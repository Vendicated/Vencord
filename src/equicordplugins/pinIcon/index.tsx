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

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findComponentByCodeLazy } from "@webpack";

const PinIcon = findComponentByCodeLazy("1-.06-.63L6.16");
export default definePlugin({
    name: "PinIcon",
    description: "Adds a pin icon to pinned messages",
    authors: [EquicordDevs.iamme],
    patches: [
        {
            find: "isUnsupported})",
            replacement: {
                match: /WITH_CONTENT\}\)/,
                replace: "$&,$self.PinnedIcon(arguments[0].message)"
            }
        }
    ],
    PinnedIcon({ pinned }: Message) {
        return pinned ? (<PinIcon size="xs" style={{ position: "absolute", right: "0", top: "0" }} />) : null;
    }
});
