/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { ReadStateStore, useStateFromStores } from "@webpack/common";

const UserGuildSettingsStore = findStoreLazy("UserGuildSettingsStore");
const JoinedThreadsStore = findStoreLazy("JoinedThreadsStore");
const NumberBadge = findComponentByCodeLazy("BADGE_NOTIFICATION_BACKGROUND", "let{count:");

const settings = definePluginSettings({
    showOnMutedChannels: {
        description: "Show unread count on muted channels",
        type: OptionType.BOOLEAN,
        default: false,
    },
    notificationCountLimit: {
        description: "Show +99 instead of true amount",
        type: OptionType.BOOLEAN,
        default: false,
    },
});

export default definePlugin({
    name: "UnreadCountBadge",
    authors: [Devs.Joona],
    description: "Shows unread message count badges on channels in the channel list",
    settings,

    patches: [
        // Kanged from typingindicators
        {
            find: "UNREAD_IMPORTANT:",
            replacement: [
                {
                    match: /\.Children\.count.+?:null(?<=,channel:(\i).+?)/,
                    replace: "$&,$self.CountBadge({channel: arguments[0].channel})",
                },
            ]
        },
        // Threads
        {
            // This is the thread "spine" that shows in the left
            find: "M0 15H2c0 1.6569",
            replacement: [
                {
                    match: /mentionsCount:\i.{0,50}?null/,
                    replace: "$&,$self.CountBadge({channel: arguments[0].thread})",
                },
            ]
        },
    ],

    CountBadge: ErrorBoundary.wrap(({ channel }: { channel: Channel; }) => {
        const unreadCount = useStateFromStores([ReadStateStore], () => ReadStateStore.getUnreadCount(channel.id));
        if (!unreadCount) return null;

        if (!settings.store.showOnMutedChannels && (UserGuildSettingsStore.isChannelMuted(channel.guild_id, channel.id) || JoinedThreadsStore.isMuted(channel.id)))
            return null;

        return (
            <NumberBadge
                color="var(--brand-500)"
                count={
                    unreadCount > 99 && settings.store.notificationCountLimit
                        ? "+99"
                        : unreadCount
                }
            />
        );
    }, { noop: true }),
});
