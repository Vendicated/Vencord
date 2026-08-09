/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelStore, GuildStore, IconUtils, UserStore } from "@webpack/common";

import type { ChannelTagMap } from "./data";

export type TagsChannel =
    {
        id: string;
        name: string;
    } & (
        {
            kind: "dm" | "groupDm";
            avatarUrl: string | null;
        } | (
            {
                kind: "guild";
                guildId: string;
            } &
            (
                {
                    thread: false;
                    parent?: undefined;
                } |
                {
                    thread: true;
                    parent: { id: string; name: string; };
                }
            )
        )
    );

export interface TagsGuild {
    id: string;
    name: string;
    iconUrl: string | null;
}

export type TagsChannelMap = Record<string, TagsChannel>;
export type TagsGuildMap = Record<string, TagsGuild>;

function captureChannel(channelId: string): { channel: TagsChannel; guild?: TagsGuild; } | undefined {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return;

    if (channel.isDM()) {
        const recipient = UserStore.getUser(channel.getRecipientId()!);
        if (!recipient) return;

        return {
            channel: {
                id: channel.id,
                name: recipient.globalName ?? recipient.username,
                kind: "dm",
                avatarUrl: IconUtils.getUserAvatarURL(recipient)
            }
        };
    }

    if (channel.isGroupDM()) {
        return {
            channel: {
                id: channel.id,
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
            id: channel.id,
            name: channel.name,
            kind: "guild" as "guild",
            guildId: guild.id,
            thread: true as true,
            parent: { id: parent!.id, name: parent!.name }
        } :
        {
            id: channel.id,
            name: channel.name,
            kind: "guild" as "guild",
            guildId: guild.id,
            thread: false as false
        };

    return {
        channel: tagsChannel,
        guild: {
            id: guild.id,
            name: guild.name,
            iconUrl: guild.icon ? IconUtils.getGuildIconURL({
                id: guild.id,
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
    const taggedChannelIds = new Set(Object.keys(channelTags));
    for (const channelId of Object.keys(channels)) {
        if (!taggedChannelIds.has(channelId)) delete channels[channelId];
    }

    const usedGuildIds = new Set(Object.values(channels).filter(channel => channel.kind === "guild").map(channel => channel.guildId));
    for (const guildId of Object.keys(guilds)) {
        if (!usedGuildIds.has(guildId)) delete guilds[guildId];
    }

    for (const channelId of Object.keys(channelTags)) {
        const captured = captureChannel(channelId);
        if (!captured) continue;

        if (captured.guild) guilds[captured.guild.id] = captured.guild;
        channels[channelId] = captured.channel;
    }
}
