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

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Button, FluxDispatcher, GuildChannelStore, GuildStore, React, ReadStateStore } from "@webpack/common";

function onClick() {
    const channels: Array<any> = [];

    Object.values(GuildStore.getGuilds()).forEach(guild => {
        GuildChannelStore.getChannels(guild.id).SELECTABLE.forEach((c: { channel: { id: string; }; }) => {
            if (!ReadStateStore.hasUnread(c.channel.id)) return;

            channels.push({
                channelId: c.channel.id,
                // messageId: c.channel?.lastMessageId,
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
    <Button
        onClick={onClick}
        size={Button.Sizes.MIN}
        color={Button.Colors.BRAND}
        style={{ marginTop: "2px", marginBottom: "8px", marginLeft: "9px" }}
    >Read all</Button>
);

export default definePlugin({
    name: "ReadAllNotificationsButton",
    description: "Read all server notifications with a single button click!",
    authors: [Devs.kemo],
    dependencies: ["ServerListAPI"],

    renderReadAllButton: () => <ReadAllButton />,

    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderReadAllButton);
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderReadAllButton);
    }
});
