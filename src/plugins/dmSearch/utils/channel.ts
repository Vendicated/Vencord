/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelInfo, ChannelMeta } from "@plugins/dmSearch/types";
import { ChannelStore, GuildStore, UserStore } from "@webpack/common";

const TYPE_DM = 1;
const TYPE_GROUP_DM = 3;

export function channel_info(channel_id: string, meta?: ChannelMeta): ChannelInfo {
    const live = ChannelStore.getChannel(channel_id);
    if (live) return from_live(live, channel_id);
    if (meta) return from_meta(meta, channel_id);
    return { kind: "unknown", target: channel_id };
}

function from_live(channel: any, channel_id: string): ChannelInfo {
    if (channel.isDM?.()) {
        const recipient = UserStore.getUser(channel.recipients?.[0]);
        return {
            kind: "dm",
            target: `@${recipient?.globalName ?? recipient?.username ?? channel_id}`
        };
    }
    if (channel.isGroupDM?.()) {
        return { kind: "group", target: channel.name?.length ? channel.name : group_label_live(channel.recipients) };
    }
    const guild = channel.guild_id ? GuildStore.getGuild(channel.guild_id) : null;
    return {
        kind: "server",
        target: `#${channel.name ?? channel_id}`,
        server: guild?.name
    };
}

function from_meta(meta: ChannelMeta, channel_id: string): ChannelInfo {
    if (meta.type === TYPE_DM) {
        const r = meta.recipients?.[0];
        return {
            kind: "dm",
            target: `@${r?.global_name ?? r?.username ?? channel_id}`
        };
    }
    if (meta.type === TYPE_GROUP_DM) {
        return { kind: "group", target: meta.name?.length ? meta.name : group_label_meta(meta.recipients) };
    }
    if (meta.guild_id) {
        const guild = GuildStore.getGuild(meta.guild_id);
        return {
            kind: "server",
            target: `#${meta.name ?? channel_id}`,
            server: guild?.name
        };
    }
    return { kind: "server", target: `#${meta.name ?? channel_id}` };
}

function group_label_live(recipients: string[] | undefined): string {
    if (!recipients?.length) return "Group DM";
    return recipients.map(id => UserStore.getUser(id)?.username).filter(Boolean).join(", ") || "Group DM";
}

function group_label_meta(recipients: ChannelMeta["recipients"]): string {
    if (!recipients?.length) return "Group DM";
    return recipients.map(r => r.username).filter(Boolean).join(", ") || "Group DM";
}
