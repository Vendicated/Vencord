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
import { findByPropsLazy } from "@webpack";
import { NavigationRouter, RelationshipStore, UserUtils } from "@webpack/common";
import { Channel, Guild } from "discord-types/general";

import settings from "./settings";
import SimpleGroupChannel from "./types/SimpleGroupChannel";
import SimpleGuild from "./types/SimpleGuild";

const DMStore = findByPropsLazy("getSortedPrivateChannels");
const GuildStore = findByPropsLazy("getGuilds", "getGuild");
const Notifications = findByPropsLazy("showNotification", "requestPermission");

const guilds = new Map<string, SimpleGuild>();
const groups = new Map<string, SimpleGroupChannel>();
const friends: { friends: string[]; requests: string[] } = {
    friends: [],
    requests: []
};

export async function syncAndRunChecks() {
    const oldGuilds: Map<string, SimpleGuild> | undefined = await DataStore.get("relationship-notifier-guilds");
    const oldGroups: Map<string, SimpleGroupChannel> | undefined = await DataStore.get("relationship-notifier-groups");
    const oldFriends: { friends: string[]; requests: string[] } | undefined = await DataStore.get("relationship-notifier-friends");

    await syncGuilds();
    await syncGroups();
    await syncFriends();

    if (settings.store.offlineRemovals) {
        const removedGuilds = oldGuilds ? [...oldGuilds.keys()].filter(id => !guilds.has(id)) : [];
        const removedGroups = oldGroups ? [...oldGroups.keys()].filter(id => !groups.has(id)) : [];
        const removedFriends = oldFriends ? [...oldFriends.friends].filter(id => !friends.friends.includes(id)) : [];
        const removedRequests = oldFriends ? [...oldFriends.requests].filter(id => !friends.requests.includes(id)) : [];

        if (settings.store.groups) {
            removedGroups.forEach(id => {
                const group = oldGroups?.get(id);
                if (group) notify(`You are no longer in the group ${group.name}.`, group.iconURL);
            });
        }

        if (settings.store.servers) {
            removedGuilds.forEach(id => {
                const guild = oldGuilds?.get(id);
                if (guild) notify(`You are no longer in the guild ${guild.name}.`, guild.iconURL);
            });
        }

        if (settings.store.friends) {
            for (const id of removedFriends) {
                const user = await UserUtils.fetchUser(id).catch(() => undefined);
                if (user) notify(`You are no longer friends with ${user.tag}.`, user.getAvatarURL(undefined, undefined, false));
            }
        }

        if (settings.store.friendRequestCancels) {
            for (const id of removedRequests) {
                const user = await UserUtils.fetchUser(id).catch(() => undefined);
                if (user) notify(`Friend request from ${user.tag} has been removed.`, user.getAvatarURL(undefined, undefined, false));
            }
        }
    }
}

export function notify(text: string, icon?: string) {
    if (!document.hasFocus() && settings.store.notifications) {
        Notifications.showNotification(icon, "Relationship Notifier", text, {
            onClick: () => NavigationRouter.transitionTo("/channels/@me")
        }, {});
    }
    Notices.showNotice(text, "OK", () => Notices.popNotice());
}

export function getGuild(id: string) {
    return guilds.get(id);
}

export function deleteGuild(id: string) {
    guilds.delete(id);
    syncGuilds();
}

export async function syncGuilds() {
    const currentGuilds: [string, Guild][] = Object.entries(GuildStore.getGuilds());
    for (const [id, guild] of currentGuilds) {
        guilds.set(id, {
            id,
            name: guild.name,
            iconURL: guild.icon ? `https://cdn.discordapp.com/icons/${id}/${guild.icon}.png` : undefined
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
    const currentChannels: Channel[] = DMStore.getSortedPrivateChannels();
    for (const channel of currentChannels) {
        if (channel.type !== 3) continue;
        groups.set(channel.id, {
            id: channel.id,
            name: channel.name ? channel.name : channel.rawRecipients.map(r => r.username).join(", "),
            iconURL: channel.icon ? `https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.png` : undefined
        });
    }
    await DataStore.set("relationship-notifier-groups", groups);
}

export async function syncFriends() {
    const allFriends = RelationshipStore.getRelationships();
    friends.friends = Object.entries(allFriends).filter(([_, type]) => type === 1).map(([id]) => id);
    friends.requests = Object.entries(allFriends).filter(([_, type]) => type === 3).map(([id]) => id);
    await DataStore.set("relationship-notifier-friends", friends);
}
