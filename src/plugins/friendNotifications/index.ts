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

import { addContextMenuPatch, removeContextMenuPatch } from "@api/ContextMenu";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

import { contextMenuOpen, UserContext } from "./context";
import settings from "./settings";
import { init, presenceUpdate } from "./utils";

export default definePlugin({
    name: "Friend Notifications",
    description: "Send notifications when friends change their status.",
    authors: [
        {
            id: 372682605386137612n,
            name: "axu5",
        },
        {
            id: 131602100332396544n,
            name: "x3rt",
        }
    ],
    settings,
    contextMenuOpen,
    // Delete `patches` if you are not using code patches, as it will make
    // your plugin require restarts, and your stop() method will not be
    // invoked at all.  The presence of the key in the object alone is
    // enough to trigger this behavior, even if the value is an empty array.
    patches: [],

    flux: {
        PRESENCE_UPDATES: presenceUpdate
    },

    // Delete these two below if you are only using code patches
    async start() {
        await init();
        addContextMenuPatch("user-context", UserContext);
    },
    stop() {
        removeContextMenuPatch("user-context", UserContext);
    },
});
