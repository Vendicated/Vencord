/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelStore, GuildStore, IconUtils, UserStore } from "@webpack/common";

import { type ChannelId, type ChannelTagMap, type GuildId, keysOf, valuesOf } from "./data";

export type TagsChannel =
    {
        id: ChannelId;
        name: string;
    } & (
        {
            kind: "dm" | "groupDm";
            avatarUrl: string | null;
        } | (
            {
                kind: "guild";
                guildId: GuildId;
            } &
            (
                {
                    thread: false;
                    parent?: undefined;
                } |
                {
                    thread: true;
                    parent: { id: ChannelId; name: string; };
                }
            )
        )
    );

export interface TagsGuild {
    id: GuildId;
    name: string;
    iconUrl: string | null;
}

export type TagsChannelMap = Record<ChannelId, TagsChannel>;
export type TagsGuildMap = Record<GuildId, TagsGuild>;

function captureChannel(channelId: string): { channel: TagsChannel; guild?: TagsGuild; } | undefined {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return;

    if (channel.isDM()) {
        const recipient = UserStore.getUser(channel.getRecipientId()!);
        if (!recipient) return;

        return {
            channel: {
                id: channel.id as ChannelId,
                name: recipient.globalName ?? recipient.username,
                kind: "dm",
                avatarUrl: IconUtils.getUserAvatarURL(recipient)
            }
        };
    }

    if (channel.isGroupDM()) {
        return {
            channel: {
                id: channel.id as ChannelId,
                name: channel.name || channel.rawRecipients.map(user => user.global_name ?? user.username).join(", ") || "Group DM",
                kind: "groupDm",
                avatarUrl: IconUtils.getChannelIconURL(channel) ?? null
            }
        };
    }

    const guild = GuildStore.getGuild(channel.guild_id);
    if (!guild) return;

    const isThread = channel.isThread();
    const parent = isThread ? ChannelStore.getChannel(channel.parent_id) : undefined;
    if (isThread && !parent) return;

    const tagsChannel = isThread ?
        {
            id: channel.id as ChannelId,
            name: channel.name,
            kind: "guild" as "guild",
            guildId: guild.id as GuildId,
            thread: true as true,
            parent: { id: parent!.id as ChannelId, name: parent!.name }
        } :
        {
            id: channel.id as ChannelId,
            name: channel.name,
            kind: "guild" as "guild",
            guildId: guild.id as GuildId,
            thread: false as false
        };

    return {
        channel: tagsChannel,
        guild: {
            id: guild.id as GuildId,
            name: guild.name,
            iconUrl: guild.icon ? IconUtils.getGuildIconURL({
                id: guild.id as GuildId,
                icon: guild.icon,
                canAnimate: true,
                size: 32
            }) ?? null : null
        }
    };
}

export function populateMetadata(
    channelTags: ChannelTagMap,
    channels: TagsChannelMap,
    guilds: TagsGuildMap
) {
    const taggedChannelIds = new Set(keysOf(channelTags));
    for (const channelId of keysOf(channels)) {
        if (!taggedChannelIds.has(channelId)) delete channels[channelId];
    }

    const usedGuildIds = new Set(valuesOf(channels).filter(channel => channel.kind === "guild").map(channel => channel.guildId));
    for (const guildId of keysOf(guilds)) {
        if (!usedGuildIds.has(guildId)) delete guilds[guildId];
    }

    for (const channelId of keysOf(channelTags)) {
        const captured = captureChannel(channelId);
        if (!captured) continue;

        if (captured.guild) guilds[captured.guild.id] = captured.guild;
        channels[channelId] = captured.channel;
    }
}
