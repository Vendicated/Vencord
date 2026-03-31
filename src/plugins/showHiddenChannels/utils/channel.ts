/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import type { Channel, Role } from "@vencord/discord-types";
import { ChannelStore, PermissionsBits, PermissionStore } from "@webpack/common";

export type StreamLookupChannel = Channel | { id?: string | null; channelId?: string | null; } | null;
export type HiddenChannelLookup = Channel | { channelId?: string | null; } | null;

export interface GuildChannelEntry {
    channel: Channel;
    comparator: number;
}

export type GuildChannels = Record<string | number, Array<GuildChannelEntry> | string | number>;

export function getChannelIdForStreamLookup(channel: StreamLookupChannel) {
    return channel == null
        ? null
        : "channelId" in channel
            ? channel.channelId ?? null
            : channel.id ?? null;
}

export function isHiddenChannel(channel: HiddenChannelLookup, checkConnect = false) {
    try {
        if (channel == null) return false;

        const resolvedChannel: Channel | null = "channelId" in channel
            ? (channel.channelId == null ? null : ChannelStore.getChannel(channel.channelId))
            : channel as Channel;

        if (resolvedChannel == null || resolvedChannel.isDM() || resolvedChannel.isGroupDM() || resolvedChannel.isMultiUserDM()) {
            return false;
        }

        if (["browse", "customize", "guide"].includes(resolvedChannel.id)) {
            return false;
        }

        return !PermissionStore.can(PermissionsBits.VIEW_CHANNEL, resolvedChannel)
            || checkConnect && !PermissionStore.can(PermissionsBits.CONNECT, resolvedChannel);
    } catch (error) {
        console.error("[ViewHiddenChannels#isHiddenChannel]: ", error);
        return false;
    }
}

function isUncategorized(entry: GuildChannelEntry) {
    return entry.channel.id === "null" && entry.channel.name === "Uncategorized" && entry.comparator === -1;
}

export function resolveGuildChannels(channels: GuildChannels, shouldIncludeHidden: boolean) {
    if (shouldIncludeHidden) return channels;

    const resolvedChannels: GuildChannels = {};

    for (const [key, value] of Object.entries(channels)) {
        if (!Array.isArray(value)) {
            resolvedChannels[key] = value;
            continue;
        }

        const visibleChannels: GuildChannelEntry[] = [];

        for (const entry of value) {
            const channelId = entry.channel.id as string | null;
            if (isUncategorized(entry) || channelId == null || !isHiddenChannel(entry.channel)) {
                visibleChannels.push(entry);
            }
        }

        resolvedChannels[key] = visibleChannels;
    }

    return resolvedChannels;
}

export function swapViewChannelWithConnectPermission(mergedPermissions: bigint, channel: Channel) {
    if (!PermissionStore.can(PermissionsBits.CONNECT, channel)) {
        mergedPermissions &= ~PermissionsBits.VIEW_CHANNEL;
        mergedPermissions |= PermissionsBits.CONNECT;
    }

    return mergedPermissions;
}

export function makeAllowedRolesReduce(guildId: string) {
    return [
        (previousRoles: Array<Role>, _: Role, index: number, roles: Array<Role>) => {
            if (index !== 0) return previousRoles;

            const everyoneRole = roles.find(role => role.id === guildId);
            return everyoneRole ? [everyoneRole] : roles;
        },
        [] as Array<Role>
    ] as const;
}
