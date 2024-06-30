/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./style.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { type FluxStore, GuildChannelType, ReadStateType, type ThreadChannelRecord } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { Button, FluxDispatcher, GuildChannelStore, GuildStore, ReadStateStore } from "@webpack/common";

interface ThreadJoined {
    channel: ThreadChannelRecord;
    joinTimestamp: number;
}

type ThreadsJoined = Record<string, ThreadJoined>;
type ThreadsJoinedByParent = Record<string, ThreadsJoined>;

const ActiveJoinedThreadsStore: FluxStore & {
    getActiveJoinedThreadsForGuild(guildId: string): ThreadsJoinedByParent;
} = findStoreLazy("ActiveJoinedThreadsStore");

function onClick() {
    const channels: {
        channelId: string;
        messageId: string | null;
        readStateType: ReadStateType;
    }[] = [];

    GuildStore.getGuildIds().forEach(guildId => {
        const guildChannels = GuildChannelStore.getChannels(guildId);
        [
            ...guildChannels[GuildChannelType.SELECTABLE],
            ...guildChannels[GuildChannelType.VOCAL],
            ...Object.values(ActiveJoinedThreadsStore.getActiveJoinedThreadsForGuild(guildId))
                .flatMap(threadChannels => Object.values(threadChannels))
        ].forEach(({ channel: { id } }) => {
            if (ReadStateStore.hasUnread(id)) {
                channels.push({
                    channelId: id,
                    messageId: ReadStateStore.lastMessageId(id),
                    readStateType: ReadStateType.CHANNEL
                });
            }
        });
    });

    FluxDispatcher.dispatch({
        type: "BULK_ACK",
        context: "APP",
        channels: channels
    });
}

const ReadAllButton = () => (
    <Button
        onClick={onClick}
        size={Button.Sizes.MIN}
        color={Button.Colors.CUSTOM}
        className="vc-ranb-button"
    >
        Read All
    </Button>
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
