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
import { RelationshipType } from "@vencord/discord-types";
import { ChannelStore, UserActionCreators } from "@webpack/common";

import settings from "./settings";
import type { ChannelDeleteAction, GuildDeleteAction, RelationshipRemoveAction } from "./types";
import { deleteGroupDM, deleteGuild, getGroupDM, getGuild, GuildAvailabilityStore, notify } from "./utils";

let manuallyRemovedFriend: string | undefined;
let manuallyRemovedGuild: string | undefined;
let manuallyRemovedGroupDM: string | undefined;

export const removeFriend = (userId: string) => manuallyRemovedFriend = userId;
export const removeGuild = (guildId: string) => manuallyRemovedGuild = guildId;
export const removeGroupDM = (channelId: string) => manuallyRemovedGroupDM = channelId;

export async function onRelationshipRemove({ relationship: { type, id } }: RelationshipRemoveAction) {
    if (manuallyRemovedFriend === id) {
        manuallyRemovedFriend = undefined;
        return;
    }

    const user = await UserActionCreators.getUser(id).catch(() => null);
    if (!user) return;

    switch (type) {
        case RelationshipType.FRIEND:
            if (settings.store.friends)
                notify(
                    `${getUniqueUsername(user)} removed you as a friend.`,
                    user.getAvatarURL(),
                    () => openUserProfile(user.id)
                );
            break;
        case RelationshipType.PENDING_INCOMING:
            if (settings.store.friendRequestCancels)
                notify(
                    `A friend request from ${getUniqueUsername(user)} has been removed.`,
                    user.getAvatarURL(),
                    () => openUserProfile(user.id)
                );
            break;
    }
}

export function onGuildDelete({ guild: { id, unavailable } }: GuildDeleteAction) {
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

export function onChannelDelete({ channel, channel: { id } }: ChannelDeleteAction) {
    if (!settings.store.groups) return;
    if ("isGroupDM" in channel) {
        if (!channel.isGroupDM()) return;
    } else
        if (!ChannelStore.getChannel(id)?.isGroupDM()) return;

    if (manuallyRemovedGroupDM === id) {
        deleteGroupDM(id);
        manuallyRemovedGroupDM = undefined;
        return;
    }

    const group = getGroupDM(id);
    if (group) {
        deleteGroupDM(id);
        notify(`You were removed from the group ${group.name}.`, group.iconURL);
    }
}
