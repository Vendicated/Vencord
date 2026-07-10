/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { ChannelStore, GuildMemberStore, SelectedChannelStore, UserStore } from "@webpack/common";

import { mountNotifications, unmountNotifications } from "./NotificationManager";
import { settings } from "./settings";
import { pushToast } from "./store";

// Discord's own internal check used to decide whether to show a notification
// at all (respects muted channels/guilds, suppressed @everyone, and whether
// you're already focused on that exact channel).
const notificationsShouldNotify: (message: Message, channelId: string) => boolean =
    findByCodeLazy(".SUPPRESS_NOTIFICATIONS))return!1");

function isMentioned(message: Message, guildId: string): boolean {
    const me = UserStore.getCurrentUser();
    if ((message as any).mentions?.some((m: any) => m.id === me.id)) return true;
    if ((message as any).mention_everyone) return true;

    const roleMentions: string[] = (message as any).mention_roles ?? [];
    if (!roleMentions.length) return false;

    const myRoles = GuildMemberStore.getSelfMember(guildId)?.roles ?? [];
    return roleMentions.some(r => myRoles.includes(r));
}

export default definePlugin({
    name: "DMNotifications",
    description: "Animated, customizable toast notifications for DMs and mentions with a quick reply bar, no matter what channel you're viewing.",
    authors: [Devs.lunomium],
    settings,

    start() {
        mountNotifications();
    },

    stop() {
        unmountNotifications();
    },

    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: Message; optimistic: boolean; }) {
            if (optimistic) return;
            if (message.author?.id === UserStore.getCurrentUser().id) return;
            if (settings.store.ignoreBots && message.author?.bot) return;

            const channel = ChannelStore.getChannel(message.channel_id);
            if (!channel) return;

            // Don't show a toast for the channel/DM you're currently looking at,
            // regardless of whether the window has focus.
            if (SelectedChannelStore.getChannelId() === message.channel_id) return;

            if (!notificationsShouldNotify(message, message.channel_id)) return;

            let allow = false;
            if (channel.isDM()) {
                allow = settings.store.notifyDms;
            } else if (channel.isGroupDM?.() || channel.isMultiUserDM?.()) {
                allow = settings.store.notifyGroupDms;
            } else if (channel.guild_id) {
                if (settings.store.notifyAllServerMessages) allow = true;
                else if (settings.store.notifyMentionsInServers && isMentioned(message, channel.guild_id)) allow = true;
            }

            if (!allow) return;

            pushToast(message, channel, settings.store.maxToasts);
        }
    }
});
