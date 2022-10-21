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
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "BetterUploadButton",
    authors: [Devs.obscurity],
    description: "Upload with a single click, open menu with right click",
    patches: [
        {
            find: "Messages.CHAT_ATTACH_UPLOAD_OR_INVITE",
            replacement: {
                match: /CHAT_ATTACH_UPLOAD_OR_INVITE,onDoubleClick:([^,]+),onClick:([^,]+)}}/,
                replace:
                    "CHAT_ATTACH_UPLOAD_OR_INVITE,onClick:$1,onContextMenu:$2}}",
            },
        },
    ],
});
