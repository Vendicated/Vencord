/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { ReadStateStore, useStateFromStores } from "@webpack/common";
import { Channel } from "discord-types/general";
import { JSX } from "react";

const UserGuildSettingsStore = findStoreLazy("UserGuildSettingsStore");
const JoinedThreadsStore = findStoreLazy("JoinedThreadsStore");

function NumberBadge({ className, count, width, padding }) {
    // To whoever used svgs here,
    // Please. svgs bad and buggy unless used as an icon
    // + The css values are directly copied from discord's ping badge
    return <div
        className={className}
        style={{ minWidth: width, paddingLeft: padding, paddingRight: padding }}
    >
        {count}
    </div>;
}

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
    replaceWhiteDot: {
        description: "Replace the white dot with the badge",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true,
    },
});

export default definePlugin({
    name: "UnreadCountBadge",
    authors: [Devs.Joona, EquicordDevs.Panniku],
    description: "Shows unread message count badges on channels in the channel list",
    settings,

    patches: [
        // Kanged from typingindicators
        {
            find: "UNREAD_IMPORTANT:",
            replacement: [
                {
                    match: /\.name,{.{0,140}\.children.+?:null/,
                    replace: "$&,$self.CountBadge({channel: arguments[0].channel,})",
                    predicate: () => !settings.store.replaceWhiteDot
                },
                {
                    match: /\(0,\i\.jsx\)\("div",{className:\i\(\)\(\i\.unread,\i\?\i\.unreadImportant:void 0\)}\)/,
                    replace: "$self.CountBadge({channel: arguments[0].channel, whiteDot:$&})",
                    predicate: () => settings.store.replaceWhiteDot
                }
            ]
        },
        // Threads
        {
            // This is the thread "spine" that shows in the left
            find: "spineWithGuildIcon]:",
            replacement: [
                {
                    match: /mentionsCount:\i.{0,50}?null/,
                    replace: "$&,$self.CountBadge({channel: arguments[0].thread})",
                    predicate: () => !settings.store.replaceWhiteDot
                },
                {
                    match: /\(0,\i\.jsx\)\("div",{className:\i\(\)\(\i\.unread,\i\.unreadImportant\)}\)/,
                    replace: "$self.CountBadge({channel: arguments[0].thread, whiteDot:$&})",
                    predicate: () => settings.store.replaceWhiteDot
                }
            ]
        },
    ],

    CountBadge: ErrorBoundary.wrap(({ channel, whiteDot }: { channel: Channel, whiteDot?: JSX.Element; }) => {
        const unreadCount = useStateFromStores([ReadStateStore], () => ReadStateStore.getUnreadCount(channel.id));
        if (!unreadCount) return whiteDot || null;

        if (!settings.store.showOnMutedChannels && (UserGuildSettingsStore.isChannelMuted(channel.guild_id, channel.id) || JoinedThreadsStore.isMuted(channel.id)))
            return null;

        // Im not sure if the "dot" ever appends, hence why the css is almost left unmodified for these classes
        const className = `vc-unreadCountBadge${whiteDot ? "-dot" : ""}${channel.threadMetadata ? "-thread" : ""}`;

        let paddingValue: Number = 0;
        if (unreadCount >= 100) { paddingValue = 4; } else
            if (unreadCount >= 10) { paddingValue = 2; } else
                paddingValue = 0;
        let widthValue = 16;
        if (unreadCount >= 100) { widthValue = 30; } else
            if (unreadCount >= 10) { widthValue = 22; } else
                widthValue = 16;

        return (
            <NumberBadge
                className={"vc-unreadCountBadge " + className}
                count={
                    unreadCount > 99 && settings.store.notificationCountLimit
                        ? "+99"
                        : unreadCount
                }
                width={widthValue}
                padding={paddingValue}
            />
        );
    }, { noop: true }),
});
