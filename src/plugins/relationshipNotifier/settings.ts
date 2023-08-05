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

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export default definePluginSettings({
    notices: {
        type: OptionType.BOOLEAN,
        description: "Also show a notice at the top of your screen when removed (use this if you don't want to miss any notifications).",
        default: false
    },
    offlineRemovals: {
        type: OptionType.BOOLEAN,
        description: "Notify you when starting discord if you were removed while offline.",
        default: true
    },
    friends: {
        type: OptionType.BOOLEAN,
        description: "Notify when a friend removes you",
        default: true
    },
    friendRequestCancels: {
        type: OptionType.BOOLEAN,
        description: "Notify when a friend request is cancelled",
        default: true
    },
    servers: {
        type: OptionType.BOOLEAN,
        description: "Notify when removed from a server",
        default: true
    },
    groups: {
        type: OptionType.BOOLEAN,
        description: "Notify when removed from a group chat",
        default: true
    }
});
