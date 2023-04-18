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

import { FluxEvents } from "@webpack/types";

import { onChannelDelete, onGuildDelete, onRelationshipRemove } from "./functions";
import { syncAndRunChecks, syncFriends, syncGroups, syncGuilds } from "./utils";

export const FluxHandlers: Partial<Record<FluxEvents, Array<(data: any) => void>>> = {
    GUILD_CREATE: [syncGuilds],
    GUILD_DELETE: [onGuildDelete],
    CHANNEL_CREATE: [syncGroups],
    CHANNEL_DELETE: [onChannelDelete],
    RELATIONSHIP_ADD: [syncFriends],
    RELATIONSHIP_UPDATE: [syncFriends],
    RELATIONSHIP_REMOVE: [syncFriends, onRelationshipRemove],
    CONNECTION_OPEN: [syncAndRunChecks]
};

export function forEachEvent(fn: (event: FluxEvents, handler: (data: any) => void) => void) {
    for (const event in FluxHandlers) {
        for (const cb of FluxHandlers[event]) {
            fn(event as FluxEvents, cb);
        }
    }
}
