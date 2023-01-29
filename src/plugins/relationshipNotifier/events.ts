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

import { onChannelDelete, onGuildDelete, onRelationshipRemove } from "./functions";
import { syncFriends, syncGroups, syncGuilds } from "./utils";

const events = [
    {
        name: "GUILD_CREATE",
        callbacks: [syncGuilds]
    },
    {
        name: "GUILD_DELETE",
        callbacks: [onGuildDelete]
    },
    {
        name: "CHANNEL_CREATE",
        callbacks: [syncGroups]
    },
    {
        name: "CHANNEL_DELETE",
        callbacks: [onChannelDelete]
    },
    {
        name: "RELATIONSHIP_ADD",
        callbacks: [syncFriends]
    },
    {
        name: "RELATIONSHIP_UPDATE",
        callbacks: [syncFriends]
    },
    {
        name: "RELATIONSHIP_REMOVE",
        callbacks: [syncFriends, onRelationshipRemove]
    }
] as const;

export default events;
