/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { TextButton } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { FluxDispatcher, GuildChannelStore, GuildStore, React, ReadStateStore } from "@webpack/common";

interface ThreadJoined {
    channel: Channel;
    joinTimestamp: number;
}

type ThreadsJoined = Record<string, ThreadJoined>;
type ThreadsJoinedByParent = Record<string, ThreadsJoined>;

interface ActiveJoinedThreadsStore {
    getActiveJoinedThreadsForGuild(guildId: string): ThreadsJoinedByParent;
}

const ActiveJoinedThreadsStore: ActiveJoinedThreadsStore = findStoreLazy("ActiveJoinedThreadsStore");

function onClick() {
    const channels: Array<any> = [];

    Object.values(GuildStore.getGuilds()).forEach(guild => {
        GuildChannelStore.getChannels(guild.id).SELECTABLE // Array<{ channel, comparator }>
            .concat(GuildChannelStore.getChannels(guild.id).VOCAL) // Array<{ channel, comparator }>
            .concat(
                Object.values(ActiveJoinedThreadsStore.getActiveJoinedThreadsForGuild(guild.id))
                    .flatMap(threadChannels => Object.values(threadChannels))
            )
            .forEach((c: { channel: { id: string; }; }) => {
                if (!ReadStateStore.hasUnread(c.channel.id)) return;

                channels.push({
                    channelId: c.channel.id,
                    messageId: ReadStateStore.lastMessageId(c.channel.id),
                    readStateType: 0
                });
            });
    });

    FluxDispatcher.dispatch({
        type: "BULK_ACK",
        context: "APP",
        channels: channels
    });
}

const ReadAllButton = () => (
    <TextButton
        variant="secondary"
        onClick={onClick}
        className="vc-ranb-button"
    >
        Read All
    </TextButton>
);

export default definePlugin({
    name: "ReadAllNotificationsButton",
    description: "Read all server notifications with a single button click!",
    authors: [Devs.kemo],
    dependencies: ["ServerListAPI"],

    renderReadAllButton: ErrorBoundary.wrap(ReadAllButton, { noop: true }),

    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderReadAllButton);
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderReadAllButton);
    }
});
