/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { ChannelTags } from "./ChannelTags";
import { patchChannelContextMenu, patchDmListContextMenu } from "./contextMenu";
import { settings } from "./settings";

export default definePlugin({
    name: "ChannelTags",
    description: "Adds custom tags with colors and shapes to channels.",
    authors: [Devs.ruirize],
    settings,
    patches: [
        {
            find: "UNREAD_IMPORTANT:",
            replacement: {
                match: /\.Children\.count.+?:null(?<=,channel:(\i).+?)/,
                replace: "$&,$self.renderChannelTags($1.id)"
            }
        },
        {
            find: "M0 15H2c0 1.6569",
            replacement: {
                match: /(\(0,\i\.jsx\)\(\i,\{thread:(\i),countInVoice:\i,hasVideo:\i,mentionCount:\i,isMentionLowImportance:\i\}\))/,
                replace: "$1,$self.renderChannelTags($2.id)"
            }
        }
    ],
    contextMenus: {
        "channel-context": patchChannelContextMenu,
        "thread-context": patchChannelContextMenu,
        "gdm-context": patchChannelContextMenu,
        "user-context": patchDmListContextMenu
    },
    renderChannelTags: (channelId?: string) => channelId
        ? (
            <ErrorBoundary noop>
                <ChannelTags channelId={channelId} />
            </ErrorBoundary>
        )
        : null,
    renderMemberListDecorator: ({ channel }) => channel
        ? <ChannelTags channelId={channel.id} />
        : null
});
