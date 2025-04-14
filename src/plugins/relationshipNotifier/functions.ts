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

import { getUniqueUsername, openUserProfile } from "@utils/discord";
import { UserUtils } from "@webpack/common";

import settings from "./settings";
import { ChannelDelete, ChannelType, GuildDelete, RelationshipRemove, RelationshipType } from "./types";
import { deleteGroup, deleteGuild, getGroup, getGuild, GuildAvailabilityStore, notify } from "./utils";

let manuallyRemovedFriend: string | undefined;
let manuallyRemovedGuild: string | undefined;
let manuallyRemovedGroup: string | undefined;

export const removeFriend = (id: string) => manuallyRemovedFriend = id;
export const removeGuild = (id: string) => manuallyRemovedGuild = id;
export const removeGroup = (id: string) => manuallyRemovedGroup = id;

export async function onRelationshipRemove({ relationship: { type, id } }: RelationshipRemove) {
    if (manuallyRemovedFriend === id) {
        manuallyRemovedFriend = undefined;
        return;
    }

    const user = await UserUtils.getUser(id)
        .catch(() => null);
    if (!user) return;

    switch (type) {
        case RelationshipType.FRIEND:
            if (settings.store.friends)
                notify(
                    `${getUniqueUsername(user)} removed you as a friend.`,
                    user.getAvatarURL(undefined, undefined, false),
                    () => openUserProfile(user.id)
                );
            break;
        case RelationshipType.INCOMING_REQUEST:
            if (settings.store.friendRequestCancels)
                notify(
                    `A friend request from ${getUniqueUsername(user)} has been removed.`,
                    user.getAvatarURL(undefined, undefined, false),
                    () => openUserProfile(user.id)
                );
            break;
    }
}

export function onGuildDelete({ guild: { id, unavailable } }: GuildDelete) {
    if (!settings.store.servers) return;
    if (unavailable || GuildAvailabilityStore.isUnavailable(id)) return;

    if (manuallyRemovedGuild === id) {
        deleteGuild(id);
        manuallyRemovedGuild = undefined;
        return;
    }

    const guild = getGuild(id);
    if (guild) {
        deleteGuild(id);
        notify(`You were removed from the server ${guild.name}.`, guild.iconURL);
    }
}

export function onChannelDelete({ channel: { id, type } }: ChannelDelete) {
    if (!settings.store.groups) return;
    if (type !== ChannelType.GROUP_DM) return;

    if (manuallyRemovedGroup === id) {
        deleteGroup(id);
        manuallyRemovedGroup = undefined;
        return;
    }

    const group = getGroup(id);
    if (group) {
        deleteGroup(id);
        notify(`You were removed from the group ${group.name}.`, group.iconURL);
    }
}
