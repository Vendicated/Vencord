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
import { definePluginSettings } from "@api/Settings";
import { TextButton } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ActiveJoinedThreadsStore, ChannelStore, FluxDispatcher, GuildChannelStore, GuildStore, React, ReadStateStore } from "@webpack/common";

const settings = definePluginSettings({
    readAllGuilds: {
        type: OptionType.BOOLEAN,
        description: "Mark all guild notifications as read",
        default: true,
    },
    readAllDms: {
        type: OptionType.BOOLEAN,
        description: "Mark all DM notifications as read",
        default: true,
    },
});

function onClick() {
    const channels: Array<any> = [];

    if (settings.store.readAllGuilds) {
        Object.values(GuildStore.getGuilds()).forEach(guild => {
            GuildChannelStore.getChannels(guild.id).SELECTABLE
                .concat(GuildChannelStore.getChannels(guild.id).VOCAL)
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
    }

    if (settings.store.readAllDms) {
        ChannelStore.getChannelIds()
            .map(channelId => ChannelStore.getChannel(channelId))
            .forEach((c: { id: string; }) => {
                if (!ReadStateStore.hasUnread(c.id)) return;

                channels.push({
                    channelId: c.id,
                    messageId: ReadStateStore.lastMessageId(c.id),
                    readStateType: 0
                });
            });
    }

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
    description: "Read all server and DM notifications with a single button click!",
    authors: [Devs.kemo],
    dependencies: ["ServerListAPI"],
    settings,

    renderReadAllButton: ErrorBoundary.wrap(ReadAllButton, { noop: true }),

    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderReadAllButton);
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderReadAllButton);
    }
});
