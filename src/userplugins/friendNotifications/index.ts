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
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { contextMenuOpen, UserContext } from "./context";
import settings from "./settings";
import { init, presenceUpdate } from "./utils";

/**
 * This plugin sends notifications when friends change their status.
 * It also addresses the glitch with long status text.
 */

export default definePlugin({
    name: "Friend Notifications",
    description: "Send notifications when friends change their status.",
    authors: [
        Devs.Nuckyz
    ],
    settings,
    contextMenuOpen,

    // Handle presence updates to trigger notifications
    flux: {
        PRESENCE_UPDATES: presenceUpdate,
    },

    // Initialize the plugin and add context menu patch on start
    async start() {
        await init(); // Initialize plugin
        addContextMenuPatch("user-context", UserContext); // Add context menu patch
    },

    // Remove context menu patch on stop
    stop() {
        removeContextMenuPatch("user-context", UserContext); // Remove context menu patch
    },
});
