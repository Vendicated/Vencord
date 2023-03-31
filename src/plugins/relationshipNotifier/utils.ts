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

import { DataStore, Notices } from "@api/index";
import { showNotification } from "@api/Notifications";
import { ChannelStore, GuildStore, RelationshipStore, UserUtils } from "@webpack/common";

import settings from "./settings";
import { ChannelType, RelationshipType, SimpleGroupChannel, SimpleGuild } from "./types";

const guilds = new Map<string, SimpleGuild>();
const groups = new Map<string, SimpleGroupChannel>();
const friends = {
    friends: [] as string[],
    requests: [] as string[]
};

export async function syncAndRunChecks() {
    const [oldGuilds, oldGroups, oldFriends] = await DataStore.getMany([
        "relationship-notifier-guilds",
        "relationship-notifier-groups",
        "relationship-notifier-friends"
    ]) as [Map<string, SimpleGuild> | undefined, Map<string, SimpleGroupChannel> | undefined, Record<"friends" | "requests", string[]> | undefined];

    await Promise.all([syncGuilds(), syncGroups(), syncFriends()]);

    if (settings.store.offlineRemovals) {
        if (settings.store.groups && oldGroups?.size) {
            for (const [id, group] of oldGroups) {
                if (!groups.has(id))
                    notify(`You are no longer in the group ${group.name}.`, group.iconURL);
            }
        }

        if (settings.store.servers && oldGuilds?.size) {
            for (const [id, guild] of oldGuilds) {
                if (!guilds.has(id))
                    notify(`You are no longer in the server ${guild.name}.`, guild.iconURL);
            }
        }

        if (settings.store.friends && oldFriends?.friends.length) {
            for (const id of oldFriends.friends) {
                if (friends.friends.includes(id)) continue;

                const user = await UserUtils.fetchUser(id).catch(() => void 0);
                if (user)
                    notify(`You are no longer friends with ${user.tag}.`, user.getAvatarURL(undefined, undefined, false));
            }
        }

        if (settings.store.friendRequestCancels && oldFriends?.requests?.length) {
            for (const id of oldFriends.requests) {
                if (friends.requests.includes(id)) continue;

                const user = await UserUtils.fetchUser(id).catch(() => void 0);
                if (user)
                    notify(`Friend request from ${user.tag} has been revoked.`, user.getAvatarURL(undefined, undefined, false));
            }
        }
    }
}

export function notify(text: string, icon?: string) {
    if (settings.store.notices)
        Notices.showNotice(text, "OK", () => Notices.popNotice());

    showNotification({
        title: "Relationship Notifier",
        body: text,
        icon
    });
}

export function getGuild(id: string) {
    return guilds.get(id);
}

export function deleteGuild(id: string) {
    guilds.delete(id);
    syncGuilds();
}

export async function syncGuilds() {
    for (const [id, { name, icon }] of Object.entries(GuildStore.getGuilds())) {
        guilds.set(id, {
            id,
            name,
            iconURL: icon && `https://cdn.discordapp.com/icons/${id}/${icon}.png`
        });
    }
    await DataStore.set("relationship-notifier-guilds", guilds);
}

export function getGroup(id: string) {
    return groups.get(id);
}

export function deleteGroup(id: string) {
    groups.delete(id);
    syncGroups();
}

export async function syncGroups() {
    for (const { type, id, name, rawRecipients, icon } of ChannelStore.getSortedPrivateChannels()) {
        if (type === ChannelType.GROUP_DM)
            groups.set(id, {
                id,
                name: name || rawRecipients.map(r => r.username).join(", "),
                iconURL: icon && `https://cdn.discordapp.com/channel-icons/${id}/${icon}.png`
            });
    }

    await DataStore.set("relationship-notifier-groups", groups);
}

export async function syncFriends() {
    friends.friends = [];
    friends.requests = [];

    const relationShips = RelationshipStore.getRelationships();
    for (const id in relationShips) {
        switch (relationShips[id]) {
            case RelationshipType.FRIEND:
                friends.friends.push(id);
                break;
            case RelationshipType.FRIEND_REQUEST:
                friends.requests.push(id);
                break;
        }
    }

    await DataStore.set("relationship-notifier-friends", friends);
}
