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

import { UserUtils } from "@webpack/common";

import relationshipNotifier from "./index";
import ChannelDelete from "./types/events/ChannelDelete";
import GuildDelete from "./types/events/GuildDelete";
import RelationshipRemove from "./types/events/RelationshipRemove";
import { getGroup, getGuild, notify } from "./utils";

let manualRemovedFriend, manualRemovedGuild, manualRemovedGroup: string | undefined;

export function removeFriend(id: string) { manualRemovedFriend = id; }
export function removeGuild(id: string) { manualRemovedGuild = id; }
export function removeGroup(id: string) { manualRemovedGroup = id; }

export async function onRelationshipRemove(event: RelationshipRemove) {
    if (manualRemovedFriend === event.relationship.id) {
        return void (manualRemovedFriend = undefined);
    }
    const user = await UserUtils.fetchUser(event.relationship.id).catch(() => undefined);
    if (!user) return;
    switch (event.relationship.type) {
        case 1:
            if (relationshipNotifier.settings.store.friends) {
                notify(`${user.tag} removed you as a friend.`, user.getAvatarURL(undefined, undefined, false));
            }
            break;
        case 3:
            if (relationshipNotifier.settings.store.friendRequestCancels) {
                notify(`A friend request from ${user.tag} has been removed.`, user.getAvatarURL(undefined, undefined, false));
            }
            break;
    }
}

export function onGuildDelete(event: GuildDelete) {
    if (relationshipNotifier.settings.store.servers && event.guild.unavailable === undefined) {
        if (manualRemovedGuild === event.guild.id) {
            return void (manualRemovedGuild = undefined);
        }
        const guild = getGuild(event.guild.id);
        if (guild) {
            removeGuild(event.guild.id);
            notify(`You were removed from the server ${guild.name}.`, guild.iconURL);
        }
    }
}

export function onChannelDelete(event: ChannelDelete) {
    if (relationshipNotifier.settings.store.groups && event.channel.type === 3) {
        if (manualRemovedGroup === event.channel.id) {
            return void (manualRemovedGroup = undefined);
        }
        const channel = getGroup(event.channel.id);
        if (channel) {
            removeGroup(event.channel.id);
            notify(`You were removed from the group ${channel.name}.`, channel.iconURL);
        }
    }
}
