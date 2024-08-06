/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ReadStateStore, useStateFromStores } from "@webpack/common";
const { NumberBadge } = findByPropsLazy("NumberBadge");

import "./styles.css";

export default definePlugin({
    name: "UnreadCountBadge",
    authors: [Devs.Joona],
    description: "Show unread count in the channel list",
    patches: [
        // Kanged from typingindicators
        {
            find: "UNREAD_IMPORTANT:",
            replacement: {
                match: /\.name\),.{0,120}\.children.+?:null(?<=,channel:(\i).+?)/,
                replace: "$&,$self.CountBadge({channelId:$1.id})"
            }
        },
    ],

    CountBadge: ErrorBoundary.wrap(({ channelId }: { channelId: string; }) => {
        const unreadCount = useStateFromStores([ReadStateStore], () => ReadStateStore.getUnreadCount(channelId));
        if (!unreadCount) return null;
        return <NumberBadge count={unreadCount} color="var(--brand-500)" className="unreadCountBadge" />;
    }, { noop: true })
});
