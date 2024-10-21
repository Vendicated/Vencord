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
import { Icons } from "@webpack/common";
import { Message } from "discord-types/general";

export default definePlugin({
    name: "PinIcon",
    description: "Adds a pin icon to pinned messages",
    authors: [EquicordDevs.iamme],
    patches: [
        {
            find: "Messages.MESSAGE_EDITED,",
            replacement: {
                match: /Messages\.MESSAGE_EDITED,(?:[^}]*[}]){3}\)/,
                replace: "$&,$self.PinnedIcon(arguments[0].message)"
            }
        }
    ],
    PinnedIcon({ pinned }: Message) {
        return pinned ? (<Icons.PinIcon size="xs" style={{ position: "absolute", right: "0", top: "0" }} />) : null;
    }
});
