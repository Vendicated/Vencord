/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, GuildMemberStore, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    includeSelf: {
        type: OptionType.BOOLEAN,
        description: "Allow @someone to also pick yourself",
        default: false
    }
});

function getRandomUserIdForChannel(channelId: string): string | null {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return null;

    const currentUserId = UserStore.getCurrentUser()?.id;

    let candidateIds: string[] = [];

    if (channel.guild_id) {
        try {
            candidateIds = GuildMemberStore.getMemberIds(channel.guild_id) ?? [];
        } catch {
            candidateIds = [];
        }
    } else {
        const recipients = (channel.recipients ?? []) as string[];
        candidateIds = [...recipients];

        if (channel.ownerId && !candidateIds.includes(channel.ownerId)) {
            candidateIds.push(channel.ownerId);
        }
    }

    if (currentUserId) {
        if (!settings.store.includeSelf) {
            candidateIds = candidateIds.filter(id => id !== currentUserId);
        } else if (!candidateIds.includes(currentUserId)) {
            candidateIds.push(currentUserId);
        }
    }

    candidateIds = Array.from(new Set(candidateIds));

    if (candidateIds.length === 0) return null;

    const index = Math.floor(Math.random() * candidateIds.length);
    return candidateIds[index] ?? null;
}

export default definePlugin({
    name: "SomeonePing",
    description: "Type @someone to ping a random member in the current server or group DM.",
    authors: [Devs.Dulak],

    settings,

    onBeforeMessageSend(channelId, msg) {
        if (!msg.content || !msg.content.includes("@someone")) return;

        const userId = getRandomUserIdForChannel(channelId);
        if (!userId) return;

        const mention = `<@${userId}>`;

        msg.content = msg.content.replace(/@someone/g, mention);
    }
});
