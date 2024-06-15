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
import { getUniqueUsername, openUserProfile } from "@utils/discord";
import { type FluxStore, RelationshipType } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { ChannelStore, GuildMemberStore, GuildStore, IconUtils, RelationshipStore, UserActionCreators, UserStore } from "@webpack/common";

import settings from "./settings";
import type { SimpleGroupDMChannel, SimpleGuild } from "./types";

export const GuildAvailabilityStore: FluxStore & {
    totalGuilds: number;
    totalUnavailableGuilds: number;
    unavailableGuilds: string[];
    isUnavailable(guildId: string): boolean;
} = findStoreLazy("GuildAvailabilityStore");

const guilds = new Map<string, SimpleGuild>();
const groupDMs = new Map<string, SimpleGroupDMChannel>();
const friends = {
    friends: [] as string[],
    requests: [] as string[]
};

const guildsKey = () => `relationship-notifier-guilds-${UserStore.getCurrentUser()!.id}`;
const groupDMsKey = () => `relationship-notifier-groups-${UserStore.getCurrentUser()!.id}`;
const friendsKey = () => `relationship-notifier-friends-${UserStore.getCurrentUser()!.id}`;

function runMigrations() {
    DataStore.delMany(["relationship-notifier-guilds", "relationship-notifier-groups", "relationship-notifier-friends"]);
}

export async function syncAndRunChecks() {
    runMigrations();
    const [oldGuilds, oldGroupDMs, oldFriends] = await DataStore.getMany([
        guildsKey(),
        groupDMsKey(),
        friendsKey()
    ]) as [Map<string, SimpleGuild> | undefined, Map<string, SimpleGroupDMChannel> | undefined, Record<"friends" | "requests", string[]> | undefined];

    await Promise.all([syncGuilds(), syncGroups(), syncFriends()]);

    if (settings.store.offlineRemovals) {
        if (settings.store.groups && oldGroupDMs?.size) {
            for (const [channelId, { name, iconURL }] of oldGroupDMs) {
                if (!groupDMs.has(channelId))
                    notify(`You are no longer in the group ${name}.`, iconURL);
            }
        }

        if (settings.store.servers && oldGuilds?.size) {
            for (const [guildId, { name, iconURL }] of oldGuilds) {
                if (!guilds.has(guildId) && !GuildAvailabilityStore.isUnavailable(guildId))
                    notify(`You are no longer in the server ${name}.`, iconURL);
            }
        }

        if (settings.store.friends && oldFriends?.friends.length) {
            for (const userId of oldFriends.friends) {
                if (friends.friends.includes(userId)) continue;

                const user = await UserActionCreators.getUser(userId).catch(() => undefined);
                if (user)
                    notify(
                        `You are no longer friends with ${getUniqueUsername(user)}.`,
                        user.getAvatarURL(),
                        () => openUserProfile(user.id)
                    );
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (settings.store.friendRequestCancels && oldFriends?.requests?.length) {
            for (const userId of oldFriends.requests) {
                if (
                    friends.requests.includes(userId)
                    || [RelationshipType.FRIEND, RelationshipType.BLOCKED, RelationshipType.PENDING_OUTGOING]
                        .includes(RelationshipStore.getRelationshipType(userId))
                ) continue;

                const user = await UserActionCreators.getUser(userId).catch(() => undefined);
                if (user)
                    notify(
                        `Friend request from ${getUniqueUsername(user)} has been revoked.`,
                        user.getAvatarURL(),
                        () => openUserProfile(user.id)
                    );
            }
        }
    }
}

export function notify(text: string, icon?: string, onClick?: () => void) {
    if (settings.store.notices)
        Notices.showNotice(text, "OK", () => { Notices.popNotice(); });

    showNotification({
        title: "Relationship Notifier",
        body: text,
        icon,
        onClick
    });
}

export const getGuild = (guildId: string) => guilds.get(guildId);

export function deleteGuild(guildId: string) {
    guilds.delete(guildId);
    syncGuilds();
}

export async function syncGuilds() {
    guilds.clear();

    const meId = UserStore.getCurrentUser()!.id;
    for (const guild of Object.values(GuildStore.getGuilds())) {
        const { id, name } = guild;
        if (GuildMemberStore.isMember(id, meId))
            guilds.set(id, {
                id,
                name,
                iconURL: guild.getIconURL()
            });
    }

    await DataStore.set(guildsKey(), guilds);
}

export const getGroupDM = (channelId: string) => groupDMs.get(channelId);

export function deleteGroupDM(channelId: string) {
    groupDMs.delete(channelId);
    syncGroups();
}

export async function syncGroups() {
    groupDMs.clear();

    for (const channel of Object.values(ChannelStore.getMutablePrivateChannels())) {
        const { icon, id, name, rawRecipients } = channel;
        if (channel.isGroupDM())
            groupDMs.set(id, {
                id,
                name: name || rawRecipients.map(r => r.username).join(", "),
                iconURL: IconUtils.getChannelIconURL({
                    id: id,
                    icon: icon,
                    applicationId: channel.getApplicationId()
                })
            });
    }

    await DataStore.set(groupDMsKey(), groupDMs);
}

export async function syncFriends() {
    friends.friends = [];
    friends.requests = [];

    const relationships = RelationshipStore.getRelationships();
    for (const userId in relationships) {
        switch (relationships[userId]) {
            case RelationshipType.FRIEND:
                friends.friends.push(userId);
                break;
            case RelationshipType.PENDING_INCOMING:
                friends.requests.push(userId);
                break;
        }
    }

    await DataStore.set(friendsKey(), friends);
}
