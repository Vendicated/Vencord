/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Channel, Guild } from "@vencord/discord-types";
import { ChannelStore, GuildStore } from "@webpack/common";

import { sortAlphaNum } from "./data";
import { getChannelTagMap } from "./settings";

export interface TagUsageGroup {
    id: string;
    name: string;
    guild?: Guild;
    channels: Channel[];
}

const DMS_GROUP_ID = "@me";

export function getTagUsageChannelIds(tagId: string) {
    return Object.entries(getChannelTagMap())
        .filter(([, tagIds]) => tagIds.includes(tagId))
        .map(([channelId]) => channelId);
}

export function getTagUsageCounts() {
    const counts = new Map<string, number>();

    for (const tagIds of Object.values(getChannelTagMap())) {
        for (const tagId of tagIds) counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    }

    return counts;
}

export function groupTagUsageChannels(channelIds: string[]): TagUsageGroup[] {
    const groups = new Map<string, TagUsageGroup>();

    for (const channelId of channelIds) {
        const channel = ChannelStore.getChannel(channelId);
        if (!channel) continue;

        const isPrivate = channel.isPrivate();
        const groupId = isPrivate ? DMS_GROUP_ID : channel.guild_id;
        const guild = isPrivate ? undefined : GuildStore.getGuild(channel.guild_id);
        if (!isPrivate && !guild) continue;

        let group = groups.get(groupId);
        if (!group) {
            group = {
                id: groupId,
                name: guild?.name ?? "DMs",
                guild,
                channels: []
            };
            groups.set(groupId, group);
        }

        group.channels.push(channel);
    }

    for (const group of groups.values()) {
        group.channels.sort((a, b) => sortAlphaNum(a.name, b.name));
    }

    return [...groups.values()].sort((a, b) => {
        if (a.id === DMS_GROUP_ID) return -1;
        if (b.id === DMS_GROUP_ID) return 1;
        return sortAlphaNum(a.name, b.name);
    });
}
